/* Silent UI Kit — Add a Key (issue #2 §3.4) + Hot key steps (§3.5).
   One modal. Step 1 picks the mode (the pick looks selected); the next steps
   replace it in place. Every disabled primary action shows its reason. */

FLOW_COPY.add = { ...FLOW_COPY.fetch, scanHint: 'Hold the answer code from the device in front of the camera.' };

const ADD_MODES = [
  { id: 'qr', icon: 'qr', title: 'Airgap over QR Code', sub: 'Show a request code to the device, then scan its answer with the camera.' },
  { id: 'sd', icon: 'folder', title: 'Import a File', sub: 'Open a key export from a device (e.g. on an SD card) or a .json key file from Silent.' },
  { id: 'import', icon: 'pencil', title: 'Paste Xpub', sub: 'Paste the key with its origin, e.g. [73c5da0a/84\'/1\'/0\']tpubD…' },
  { id: 'hot', icon: 'key', title: 'Hot Key', sub: 'Generate or import a mnemonic, stored on this computer and sealed with a password.' },
];

const KEY_FILE_ERRORS = {
  invalid: 'This is not a valid key file.',
  newer: 'This key file was written by a newer version of Silent. Update Silent to import it.',
  network: n => `This key file is for Bitcoin, not ${n}. Switch the network in the Keys tab to import it.`,
  nofp: 'This key file has no fingerprint, so the key cannot be identified.',
  route: 'This key file has a route type Silent does not know (“nfc”). Remove that route from the file, or update Silent.',
};

const ORIGIN_RE = /^\[([0-9a-f]{8})((\/\d+['h]?)+)\]$/;
const originFp = (o) => { const m = ORIGIN_RE.exec((o || '').trim()); return m ? m[1] : null; };
const xpubOk = (x) => /^[xt]pub[1-9A-HJ-NP-Za-km-z]{100,}$/.test((x || '').trim());

/* Read-only review of what the device returned. */
/* Same row as Cached Xpubs (XpubTable), read-only. The fingerprint is in the
   modal title bar. */
const originPath = (o) => 'm/' + (o || '').replace(/^\[[0-9a-f]{8}\/?/, '').replace(/\]$/, '');
/* rows: every xpub the device or file returned; a lone origin + xpub otherwise */
function KeyReview({ origin, xpub, rows }) {
  return <XpubTable rows={rows || [{ path: originPath(origin), xpub }]} copy={false} />;
}

/* The Choose a Password body, centred at the app's width rather than spanning the
   modal. Qt: the HotKeyFlow password view at its content width. */
const HOT_PASSWORD_WIDTH = 320;

function AliasField({ value, onChange }) {
  return (
    <Field label="Alias:">
      <Input grow placeholder="Name the key" value={value} onChange={e => onChange(e.target.value)} />
    </Field>
  );
}

function AddKeyModal({ network = 'Signet', existing = [], onClose, onAdd, initial = {} }) {
  const [step, setStep] = React.useState(initial.step || 'mode');
  const [mode, setMode] = React.useState(initial.mode || null);
  const [alias, setAlias] = React.useState(initial.alias || '');
  const [res, setRes] = React.useState(initial.res || null);              // { origin, xpub } returned by device / file
  const [origin, setOrigin] = React.useState(initial.origin || '');
  const [xpub, setXpub] = React.useState(initial.xpub || '');
  const [fileErr, setFileErr] = React.useState(initial.fileError || null);
  const [sdErr, setSdErr] = React.useState(initial.sdError || false);
  // hot key
  /* the QR request's tuning, changed in QR Settings behind the gear left of Next */
  const [qrSettings, setQrSettings] = React.useState(!!initial.qrSettings);
  const [qrContrast, setQrContrast] = React.useState(3);
  const [qrDensity, setQrDensity] = React.useState(3);
  const [qrSpeed, setQrSpeed] = React.useState(3);
  const [hotKind, setHotKind] = React.useState(initial.hotKind || 'gen12');   // gen12 | gen24 | import
  const [typed, setTyped] = React.useState(initial.typed || '');
  const [inWords, setInWords] = React.useState(() => { const t = (initial.typed || '').trim().split(/\s+/).filter(Boolean); const n = initial.words || (t.length > 12 ? 24 : 12); return Array.from({ length: n }, (_, i) => t[i] || ''); });
  const [wrote, setWrote] = React.useState(!!initial.wrote);
  const [pw, setPw] = React.useState(initial.pw || '');
  const [pw2, setPw2] = React.useState(initial.pw2 || '');
  const words = React.useMemo(() => (hotKind === 'gen24' ? HOT_WORDS['9a41e6b3'] : MNEMONIC_WORDS.slice(0, 12)), [hotKind]);

  const xp = network === 'Bitcoin' ? DEMO_XPUB_M : DEMO_XPUB_T;
  const coin = network === 'Bitcoin' ? "0'" : "1'";
  const fpOf = res ? originFp(res.origin) : originFp(origin);
  const dup = fpOf && existing.some(k => k.fp === fpOf);
  const dupNotice = dup ? <Notice tone="error" title="Fingerprint already registered">Key {fpOf} is already registered as “{existing.find(k => k.fp === fpOf).alias}”.</Notice> : null;
  const aliasReason = !alias.trim() ? 'Enter an alias.' : existing.some(k => k.alias === alias.trim()) ? 'Another key already has this alias.' : null;
  const add = (o, x, routes, hasHot, rows) => onAdd && onAdd({ fp: originFp(o) || 'f00dcafe', alias: alias.trim(), routes, hasHot,
    devicesSeen: [], xpubs: rows || [{ path: 'm/' + o.slice(10, -1), xpub: x }], descriptors: [] });
  /* the QR request asks one xpub per account type, each at account 0 */
  const accountRows = ["84'", "86'", "48'", "87'"].map(p => ({ path: `m/${p}/${coin}/0'${p === "48'" ? "/2'" : ''}`, xpub: xp }));

  let title = 'Add a Key', width = 600, body;

  if (step === 'mode') {
    body = (
      /* clicking a mode goes straight to its step (no Continue) */
      <Stack gap="s">
        {ADD_MODES.map(m => <SelectRow key={m.id} icon={m.icon} title={m.title} sub={m.sub}
          onClick={() => { setMode(m.id); setStep(m.id === 'hot' ? 'hot-choose' : m.id); }} />)}
      </Stack>
    );
  } else if (step === 'qr') {
    title = 'Add a Key · QR Code';
    // The request code, on the step and again in QR Settings.
    const requestCode = (
      <QRCard size={360} bg={`hsl(220 14% ${40 + (qrContrast - 1) * 15}%)`}>
        <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: qrSvg(`UR:CRYPTO-REQUEST/XPUBS/${network.toUpperCase()}/${accountRows.map(r => r.path.slice(2).replace(/'/g, 'H').replace(/\//g, '-')).join(',')}`) }} />
      </QRCard>
    );
    body = (
      <Stack gap="m" align="center">
        {requestCode}
        <ModalActions onBack={() => setStep('mode')}>
          <Btn id="qr_settings" onClick={() => setQrSettings(true)} />
          <Btn id="next_scan_the_answer" onClick={() => setStep('qr-scan')} />
        </ModalActions>
        {qrSettings ? (
          <QrSettingsModal contrast={qrContrast} density={qrDensity} speed={qrSpeed} onContrast={setQrContrast}
            onDensity={setQrDensity} onSpeed={setQrSpeed} onClose={() => setQrSettings(false)}>
            {requestCode}
          </QrSettingsModal>
        ) : null}
      </Stack>
    );
  } else if (step === 'qr-scan') {
    title = 'Add a Key · Scan the Answer';
    body = <CameraStep context="add" force={initial.camera} progress={initial.progress} scanError={initial.scanError}
      onBack={() => setStep('qr')} onCancel={onClose}
      /* the answer names the device (vendor + model): it is the default alias, editable */
      onDone={() => { setRes({ origin: `[7e02da41/84'/${coin}/0']`, xpub: xp, rows: accountRows }); setAlias('Coldcard Mk4'); setStep('review'); }} />;
  } else if (step === 'review' || step === 'sd') {
    title = step === 'sd' ? 'Add a Key · Import a File' : 'Add a Key · Review';
    const loaded = step === 'review' || (res && !fileErr);
    const fileMsg = fileErr ? (typeof KEY_FILE_ERRORS[fileErr] === 'function' ? KEY_FILE_ERRORS[fileErr](network) : KEY_FILE_ERRORS[fileErr]) : null;
    body = (
      <Stack gap="m">
        {step === 'sd' && !loaded ? (
          <Stack gap="s">
            {/* empty state: a big folder, the file kinds in one muted line; Open File… is in the bar */}
            <Card tone="inset" pad="m">
              <Stack align="center" gap="s" style={{ padding: 'var(--space-l) 0' }}>
                <Icon name="folder" size={48} tone="muted" />
                <Text variant="caption" color="muted" align="center">Open or drop a file here</Text>
              </Stack>
            </Card>
            {sdErr ? <Notice tone="error" title="Could not read the file">The file is not a key export, or the SD card was removed. Pick the export file again.</Notice> : null}
            {fileMsg ? <Notice tone="error" title="Cannot import this file">{fileMsg}</Notice> : null}
          </Stack>
        ) : null}
        {loaded ? <KeyReview origin={res.origin} xpub={res.xpub} rows={res.rows} /> : null}
        {loaded ? dupNotice : null}
        {loaded ? <AliasField value={alias} onChange={setAlias} /> : null}
        <ModalActions onBack={() => { setRes(null); setStep(step === 'review' ? 'qr' : 'mode'); }}
          reason={!loaded ? null : dup ? 'This key is already registered.' : aliasReason}>
          {loaded
            ? <Btn id="add_key" disabled={dup || !!aliasReason} onClick={() => add(res.origin, res.xpub, [mode === 'sd' ? 'sd' : 'qr'], false, res.rows)} />
            : <Btn id="open_file" onClick={() => { setSdErr(false); setFileErr(null); setRes({ origin: `[a19c44e0/84'/${coin}/0']`, xpub: xp }); }} />}
        </ModalActions>
      </Stack>
    );
  } else if (step === 'import') {
    title = 'Add a Key · Paste Xpub';
    /* one field: the key with its origin, e.g. [73c5da0a/84'/1'/0']tpubD… */
    const m = /^(\[[^\]]*\])\s*(\S+)$/.exec(xpub.trim());
    const kOrigin = m ? m[1] : '', kXpub = m ? m[2] : '';
    const kOk = !!m && !!originFp(kOrigin) && xpubOk(kXpub);
    const kState = !xpub.trim() ? 'none' : kOk ? 'valid' : 'invalid';
    const kFp = m ? originFp(kOrigin) : null;
    const kDup = kFp && existing.some(k => k.fp === kFp);
    body = (
      <Stack gap="s">
        <FieldGroup>
        <Field label="Xpub:"><ValidatedInput mono state={kState} placeholder={`[73c5da0a/84'/1'/0']${network === 'Bitcoin' ? 'xpub' : 'tpub'}…`} value={xpub} onChange={e => setXpub(e.target.value)} wrapStyle={{ flex: 1 }} /></Field>
        {kState === 'invalid' ? <FieldNote tone="error">Paste the key with its origin, e.g. [73c5da0a/84'/1'/0']tpubD…</FieldNote> : null}
        <AliasField value={alias} onChange={setAlias} />
        </FieldGroup>
        {kDup ? <Notice tone="error" title="Fingerprint already registered">Key {kFp} is already registered as “{existing.find(k => k.fp === kFp).alias}”.</Notice> : null}
        <ModalActions onBack={() => setStep('mode')}
          reason={kState !== 'valid' ? null : kDup ? 'This key is already registered.' : aliasReason}>
          <Btn id="add_key" disabled={!kOk || kDup || !!aliasReason} onClick={() => add(kOrigin, kXpub, ['usb'], false)} />
        </ModalActions>
      </Stack>
    );
  } else if (step === 'hot-choose') {
    title = 'Add a Key · Hot Key';
    const filled = inWords.filter(Boolean).length;
    const bad = inWords.filter(x => x && !isBip39(x)).length;
    const typedOk = filled === inWords.length && bad === 0;
    body = (
      <Stack gap="m">
        <Stack gap="s">
          <SelectRow icon="refresh" title="Generate 12 Words" sub="A new mnemonic. Enough for most uses." selected={hotKind === 'gen12'} onClick={() => setHotKind('gen12')} />
          <SelectRow icon="refresh" title="Generate 24 Words" sub="A new, longer mnemonic." selected={hotKind === 'gen24'} onClick={() => setHotKind('gen24')} />
          {/* one Import row; the word count is an embedded combo (12 / 15 / 24) */}
          <SelectRow icon="pencil" title="Import Words" sub="Type an existing mnemonic." selected={hotKind === 'import'}
            onClick={() => setHotKind('import')}
            trailing={<ComboBox value={inWords.length + ' Words'} options={['12 Words', '15 Words', '24 Words']} width={110}
              onChange={l => { const n = parseInt(l, 10); setHotKind('import'); setInWords(ws => Array.from({ length: n }, (_, i) => ws[i] || '')); }} />} />
        </Stack>
        {hotKind === 'import' ? (
          <WordInputGrid words={inWords} onChange={setInWords} isWord={isBip39} />
        ) : null}
        <ModalActions onBack={() => setStep('mode')} reason={hotKind !== 'import' || typedOk ? null : bad ? `${bad} word${bad === 1 ? ' is' : 's are'} not in the word list.` : `${inWords.length - filled} word${inWords.length - filled === 1 ? '' : 's'} missing.`}>
          <Btn id="continue" disabled={hotKind === 'import' && !typedOk} onClick={() => setStep(hotKind === 'import' ? 'hot-password' : 'hot-backup')} />
        </ModalActions>
      </Stack>
    );
  } else if (step === 'hot-backup') {
    title = 'Add a Key · Back Up the Words';
    body = (
      <Stack gap="m">
        <Notice tone="warning" title="These words are shown once">Write them down in order and keep them offline. Anyone holding them holds the coins.</Notice>
        <WordGrid words={words} />
        <Checkbox checked={wrote} onChange={setWrote} label="I wrote the words down, in order." />
        <ModalActions onBack={() => setStep('hot-choose')} reason={wrote ? null : 'Confirm that you wrote the words down.'}>
          <Btn id="continue" disabled={!wrote} onClick={() => setStep('hot-password')} />
        </ModalActions>
      </Stack>
    );
  } else if (step === 'hot-password') {
    title = 'Add a Key · Choose a Password';
    const short = pw && pw.length < 8, mismatch = pw2 && pw !== pw2;
    const reason = aliasReason || (!pw ? 'Choose a password.' : short ? 'Use at least 8 characters.' : pw !== pw2 ? 'The two passwords must match.' : null);
    body = (
      <Stack gap="s">
        <Stack gap="s" style={{ width: HOT_PASSWORD_WIDTH, alignSelf: 'center' }}>
        <Text as="div" variant="body" color="secondary">The password seals the mnemonic on this computer. Silent asks for it each time the key signs.</Text>
        <FieldGroup>
        <AliasField value={alias} onChange={setAlias} />
        <Field label="Password:"><Input grow type="password" value={pw} onChange={e => setPw(e.target.value)} /></Field>
        {short ? <FieldNote tone="error">Use at least 8 characters.</FieldNote> : null}
        <Field label="Confirm:"><Input grow type="password" value={pw2} onChange={e => setPw2(e.target.value)} /></Field>
        {mismatch ? <FieldNote tone="error">The passwords do not match.</FieldNote> : null}
        </FieldGroup>
        </Stack>
        <ModalActions onBack={() => setStep(hotKind === 'import' ? 'hot-choose' : 'hot-backup')} reason={reason}>
          <Btn id="seal_key" disabled={!!reason} onClick={() => { setStep('hot-sealing'); setTimeout(() => setStep('hot-done'), 2200); }} />
        </ModalActions>
      </Stack>
    );
  } else if (step === 'hot-sealing') {
    title = 'Add a Key · Sealing';
    body = <ModalStatus spinner title="Sealing the key…" subtitle="Encrypting the mnemonic with the password. This takes a few seconds." pad="var(--space-m) 0" />;
  } else if (step === 'hot-done') {
    title = 'Add a Key';
    body = (
      <Stack gap="m">
        <ModalStatus icon="circle_check" iconColor="var(--success)" title="Key Added" subtitle={`“${alias || 'Hot Key'}” (f00dcafe) is stored on this computer and ready to sign.`} pad="var(--space-m) 0 0" />
        <ModalActions><Btn id="done" onClick={() => add(`[f00dcafe/84'/${coin}/0']`, xp, ['hot'], true)} /></ModalActions>
      </Stack>
    );
  } else if (step === 'hot-error') {
    title = 'Add a Key';
    body = (
      <Stack gap="m">
        <ModalStatus icon="circle_x" iconColor="var(--error)" title="Could Not Seal the Key" subtitle="This computer ran out of memory while encrypting the mnemonic. Close other apps, then try again." pad="var(--space-m) 0 0" />
        <ModalActions>
          <Btn id="try_again" onClick={() => { setStep('hot-sealing'); setTimeout(() => setStep('hot-done'), 2200); }} />
        </ModalActions>
      </Stack>
    );
  }

  const fpHead = (step === 'review' || step === 'sd') && res && !fileErr ? originFp(res.origin) : null;
  return <Modal title={title} width={width} onClose={onClose}
    headerRight={fpHead ? <Text variant="mono" color="secondary" size="sm">{fpHead}</Text> : null}>{body}</Modal>;
}

Object.assign(window, { AddKeyModal, ADD_MODES, KEY_FILE_ERRORS, KeyReview, AliasField, originFp, xpubOk });
