/* Silent UI Kit: MuSig2 multikey wallets (src/modules/musig).
   - CreateSharedAccount: the "Create Multikey Account" wizard (creator/CreatePolicy.cpp):
     Spend Paths, Xpubs, Review (name, backup), Register, Verify, Electrum (Create), under a WizardSteps trail.
   - SpendPathPicker: the Send spend path picker (views/Send.cpp), one entry per leaf
     named by its signers, locked while a signing session runs.
   - MusigSignModal: Sign on a Multikey Send opens it: Nonces, then Partial
     Signatures ending on Broadcast (then SentModal, Send.jsx).
   Composes catalog components only. */

const MUSIG_KEYS = [
  { fp: '28645006', alias: 'Carol', route: 'qr' },
  /* on a USB device: its xpub is the one missing by default (step 2 Xpubs) */
  { fp: '73c5da0a', alias: 'Alice', route: 'usb' },
  { fp: 'b8688df1', alias: 'Bob', route: 'qr' },
  /* not in the path: its key type combo is disabled */
  { fp: '3f635a63', alias: 'Dave', route: 'hot' },
];
/* Timelock kinds: Relative (a count after each coin is received), Absolute renewable
   (a block height, entered as a count from the tip: height = tip + count) and Date in
   the future (a date and time). Counts take a unit; one block is ten minutes. */
const MUSIG_LOCKTIMES = ['No timelock', 'Relative', 'Absolute renewable', 'Date in the future'];
const MUSIG_LOCK_UNITS = ['Blocks', 'Days', 'Weeks', 'Months'];
const MUSIG_UNIT_BLOCKS = { Blocks: 1, Days: 144, Weeks: 1008, Months: 4320 };
const MUSIG_TIP = 905210;              // the chain tip the kit run assumes
const MUSIG_MAX_RELATIVE = 65535;      // BIP68: a relative timelock counts at most 65535 blocks
const lockBlocks = (path) => (parseInt(path.lockValue, 10) || 0) * (MUSIG_UNIT_BLOCKS[path.lockUnit || 'Blocks'] || 1);
const nowLocal = () => { const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
const fmtDate = (v) => new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
/* why a path's timelock is not ready, or null */
const lockReason = (path) => {
  if (path.locktime === 'Relative' || path.locktime === 'Absolute renewable') {
    if (!path.lockValue) return 'Enter the timelock.';
    if (path.locktime === 'Relative' && lockBlocks(path) > MUSIG_MAX_RELATIVE) return 'A relative timelock is at most 65535 blocks (about 15 months).';
  }
  if (path.locktime === 'Date in the future') {
    if (!path.lockDate) return 'Pick the date.';
    if (path.lockDate <= nowLocal()) return 'Pick a date in the future.';
  }
  return null;
};
const MUSIG_KEY_TYPES = ['Internal', 'External', 'Cosigner', 'Safety Net'];
const MUSIG_ROLE_STEP = { Internal: 0, External: 1, Cosigner: 2, 'Safety Net': 3 };
const MUSIG_MAX_LEAVES = 32;
const MUSIG_ADDRESS = 'bcrt1pfml94fqkjkwhlpeeychsxxwvwqkclmw02zv8y6nkmshcdsts6jjsl989et';
const MUSIG_CHECKSUM = 'wtsttqhs';
const MUSIG_DESCRIPTOR = "tr(tpubD6NzVbkrYhZ4Wfhvyz5kokDUBLHfzhT59KSamkRVNZhq6EguZVuAf88eJVm6G3ua8YfPChCkyn2CsS7naTCBW1nL4B1Ri2BvhJKMcEvPPeJ/<2147483646;2147483647>/*,{{pk(musig([28645006/87'/1'/0'/2]tpubDF145QGMpKCb3rFmV6vAufhPQw3Bxahpp4MChSswzes7PFiNnowe3YuH2qebeurohdeeFH853C2et8rLA2kpPPZZKSV7e45nmibbewbMKtn,[73c5da0a/87'/1'/0'/0]tpubDEGU7K8ab62XTwHGRuoStbzPj9mR6XQ9jizcU5hpBemm3zenWwhcohKsgxzjQ6w1LbiA7mD8RPfvPjdAcXi4eERN32AMYFszF6j7KRWfWyc)/<512;513>/*),pk(musig([28645006/87'/1'/0'/2]tpubDF145QGMpKCb3rFmV6vAufhPQw3Bxahpp4MChSswzes7PFiNnowe3YuH2qebeurohdeeFH853C2et8rLA2kpPPZZKSV7e45nmibbewbMKtn,[b8688df1/87'/1'/0'/1]tpubDDzMtUDKwjvTaYWcQ8nSBbxmjatm1qwAHYJjbGJGATrNzTGtiQLfXR6fqrC6h1RJ1r6CNTxXjZczuzoJU9BhNjtRF8sEE254oRcx1uK6Hmt)/<514;515>/*)},{pk(musig([73c5da0a/87'/1'/0'/0]tpubDEGU7K8ab62XTwHGRuoStbzPj9mR6XQ9jizcU5hpBemm3zenWwhcohKsgxzjQ6w1LbiA7mD8RPfvPjdAcXi4eERN32AMYFszF6j7KRWfWyc,[b8688df1/87'/1'/0'/1]tpubDDzMtUDKwjvTaYWcQ8nSBbxmjatm1qwAHYJjbGJGATrNzTGtiQLfXR6fqrC6h1RJ1r6CNTxXjZczuzoJU9BhNjtRF8sEE254oRcx1uK6Hmt)/<516;517>/*),pk(tpubD6NzVbkrYhZ4Wfhvyz5kokDUBLHfzhT59KSamkRVNZhq6EguZVuAf88eJVm6G3ua8YfPChCkyn2CsS7naTCBW1nL4B1Ri2BvhJKMcEvPPeJ/<2147483644;2147483645>/*)}})";

/* A spend path: the picked keys and their key type, the keys that must sign on
   every spend (`mandatory`), the signatures required in total (`threshold`, counting
   the mandatory ones) and the timelock with its value. The default of the app run:
   2 of Carol, Alice, Bob, no timelock. */
const MUSIG_PATH = { label: '', threshold: 2, mandatory: [], locktime: 'No timelock', lockValue: '', lockUnit: 'Blocks', lockDate: '',
  keys: { '28645006': 'Cosigner', '73c5da0a': 'Internal', 'b8688df1': 'External' } };
const MUSIG_NEW_PATH = { label: '', threshold: 1, mandatory: [], locktime: 'Relative', lockValue: '', lockUnit: 'Days', lockDate: '', keys: {} };

/* a path's name: the optional one the user gave, else "Spend Path N" */
const pathTitle = (path, i) => (path.label && path.label.trim()) || `Spend Path ${i + 1}`;
const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
const pathKeys = (path, keys) => keys.filter(k => path.keys[k.fp]);
const pathMandatory = (path, keys) => pathKeys(path, keys).filter(k => (path.mandatory || []).includes(k.fp));
const pathLeaves = (path, keys) => {
  const n = pathKeys(path, keys).length, m = pathMandatory(path, keys).length;
  if (!n) return 0;
  return choose(n - m, Math.max(0, Math.min(path.threshold, n) - m));
};
const names = (ks) => ks.map(k => k.alias).join(', ');
/* about how long a block count lasts, at ten minutes a block */
const blocksSpan = (v) => {
  const h = (parseInt(v, 10) || 0) / 6;
  return h < 48 ? `about ${Math.round(h)} hours` : h < 24 * 60 ? `about ${Math.round(h / 24)} days` : `about ${Math.round(h / 24 / 30)} months`;
};
const lockWords = (path) => {
  if (!path.locktime || path.locktime === 'No timelock') return '';
  if (lockReason(path)) return ', once the timelock is set';
  const v = path.lockValue, unit = (path.lockUnit || 'Blocks').toLowerCase();
  const count = `${v} ${parseInt(v, 10) === 1 ? unit.replace(/s$/, '') : unit}`;
  if (path.locktime === 'Relative') return `, ${count} after a coin is received`;
  if (path.locktime === 'Absolute renewable') return `, from block ${MUSIG_TIP + lockBlocks(path)}, renewable`;
  return `, from ${fmtDate(path.lockDate)}`;
};
/* "Alice signs, plus any 1 of Bob, Carol" — the signers only */
const signerWords = (path, keys) => pathWords({ ...path, locktime: 'No timelock' }, keys);
/* the timelock alone, as a sentence: "30 days after a coin is received" */
const lockLine = (path) => { const w = lockWords(path).replace(/^, /, ''); return w ? w[0].toUpperCase() + w.slice(1) : 'No timelock'; };
/* "Alice signs, plus any 1 of Bob, Carol, after 4320 blocks (about 30 days)" */
const pathWords = (path, keys) => {
  const ks = pathKeys(path, keys), n = ks.length;
  if (!n) return 'No key picked yet';
  const must = pathMandatory(path, keys), others = ks.filter(k => !must.includes(k));
  const t = Math.min(path.threshold, n), k = t - must.length;
  let w;
  if (n === 1) w = `${names(ks)} signs alone`;
  else if (t >= n) w = `${names(ks)} sign together`;
  else if (!must.length) w = `Any ${t} of ${names(ks)} sign`;
  else w = `${names(must)} ${must.length > 1 ? 'sign' : 'signs'}, plus any ${k} of ${names(others)}`;
  return w + lockWords(path);
};

/* One spend path (creator/PathEditor.cpp): an optional Name (else "Spend Path N"), Keys (pick each key, and whether it is
   mandatory on every spend; picked keys are always Internal; at least one key stays
   optional), then one line each for Signatures (mandatory + 1 up to all picked) and
   Timelock (kind, then a count and its unit, or a date and time). Qt: VBox(Section + QTableWidget, QFormLayout). */
function PathEditor({ path, keys = MUSIG_KEYS, onChange }) {
  const picked = pathKeys(path, keys);
  const n = picked.length, m = pathMandatory(path, keys).length;
  /* the threshold stays within [mandatory + 1, picked] */
  const clampT = (v, nn, mm) => Math.min(Math.max(v, mm + 1, 1), Math.max(nn, 1));
  const t = clampT(path.threshold, n, m);
  const set = (patch) => {
    if (!onChange) return;
    const next = { ...path, ...patch };
    const nn = pathKeys(next, keys).length, mm = pathMandatory(next, keys).length;
    onChange({ ...next, threshold: clampT(next.threshold, nn, mm) });
  };
  const toggleKey = (fp, on) => set({
    keys: { ...path.keys, [fp]: on ? 'Internal' : undefined },
    mandatory: on ? (path.mandatory || []) : (path.mandatory || []).filter(x => x !== fp),
  });
  const toggleMust = (fp, on) => set({ mandatory: on ? [...(path.mandatory || []), fp] : (path.mandatory || []).filter(x => x !== fp) });
  const lo = Math.min(m + 1, Math.max(n, 1));
  const thresholds = Array.from({ length: Math.max(n - lo + 1, 1) }, (_, i) => (lo + i === n ? `All ${n}` : `${lo + i} of ${n}`));
  const keyColumns = [
    { header: '', width: 40, cellStyle: () => ({ padding: '0 6px', textOverflow: 'clip' }), render: (r) => <Checkbox checked={!!path.keys[r.fp]} onChange={on => toggleKey(r.fp, on)} /> },
    { header: 'Key', grow: true, render: (r) => r.alias },
    { key: 'fp', header: 'Fingerprint', width: 110, mono: true, muted: () => true },
    { header: 'Mandatory', width: 90, render: (r) => path.keys[r.fp] && n > 1
      ? <Checkbox checked={(path.mandatory || []).includes(r.fp)} onChange={on => toggleMust(r.fp, on)}
          disabled={!(path.mandatory || []).includes(r.fp) && m + 1 >= n} /> : null },
  ];
  const counted = path.locktime === 'Relative' || path.locktime === 'Absolute renewable';
  const blocks = lockBlocks(path);
  /* what the count stands for: blocks as time, other units as blocks; the height for Absolute */
  const lockHint = !counted || !path.lockValue ? null
    : path.locktime === 'Absolute renewable' ? `block ${MUSIG_TIP + blocks}`
    : (path.lockUnit || 'Blocks') === 'Blocks' ? blocksSpan(path.lockValue) : `${blocks} blocks`;
  return (
    <Stack gap="m" style={{ alignSelf: 'stretch' }}>
      <FieldGroup>
        <Field label="Name:"><Input width={260} value={path.label || ''} placeholder="Optional" onChange={e => set({ label: e.target.value })} /></Field>
      </FieldGroup>
      <Section label="Keys" dense>
        <Table columns={keyColumns} rows={keys} rowKey={(r) => r.fp} />
      </Section>
      <FieldGroup>
        {n > 1 ? (
          <Field label="Signatures:">
            <ComboBox value={t === n ? `All ${n}` : `${t} of ${n}`} options={thresholds} width={200}
              onChange={v => set({ threshold: v.startsWith('All') ? n : parseInt(v, 10) })} />
          </Field>
        ) : null}
        <Field label="Timelock:">
          <ComboBox value={path.locktime} options={MUSIG_LOCKTIMES} width={200}
            onChange={locktime => set({ locktime, lockValue: '', lockDate: '' })} />
          {counted ? (
            <React.Fragment>
              <Input mono width={90} value={path.lockValue || ''} placeholder="0"
                onChange={e => set({ lockValue: e.target.value.replace(/[^0-9]/g, '') })} />
              <ComboBox value={path.lockUnit || 'Blocks'} options={MUSIG_LOCK_UNITS} width={120} onChange={lockUnit => set({ lockUnit })} />
            </React.Fragment>
          ) : null}
          {path.locktime === 'Date in the future' ? (
            <DateTimeInput value={path.lockDate} min={nowLocal()} onChange={lockDate => set({ lockDate })} />
          ) : null}
          {lockHint ? <Text variant="caption">{lockHint}</Text> : null}
        </Field>
      </FieldGroup>
    </Stack>
  );
}

/* The Spend Paths list: one row per path (its timelock under the title, its signers
   in words on the right) opening Edit Spend Path, then the Add a Spend Path row. */
function SpendPathList({ paths, keys = MUSIG_KEYS, onOpen, onAdd }) {
  return (
    <Stack gap="xs" style={{ alignSelf: 'stretch' }}>
      {paths.map((p, i) => (
        <SelectRow key={i} title={pathTitle(p, i)} sub={lockLine(p)}
          meta={signerWords(p, keys)} onClick={() => onOpen(i)} />
      ))}
      {onAdd ? <SelectRow tone="add" icon="plus" title="Add a Spend Path" onClick={onAdd} /> : null}
    </Stack>
  );
}

/* Edit Spend Path: replaces the wizard (one modal at a time) and works on a draft;
   Save Path writes it back, Back drops it, Remove Path deletes it (not the last). */
function EditSpendPath({ index, path, keys = MUSIG_KEYS, removable, onSave, onRemove, onBack, onClose }) {
  const [draft, setDraft] = React.useState(path);
  const reason = !pathKeys(draft, keys).length ? 'Pick at least one key.'
    : lockReason(draft);
  return (
    <Modal title={pathTitle(draft, index - 1)} width={760} height="wizard" onClose={onClose}>
      <Stack gap="m" style={{ alignSelf: 'stretch', flex: 1 }}>
        <PathEditor path={draft} keys={keys} onChange={setDraft} />
        <Spacer />
        <ModalActions onBack={onBack} reason={reason}>
          {removable ? <Btn id="remove_spend_path" onClick={onRemove} /> : null}
          <Btn id="save_spend_path" disabled={!!reason} onClick={() => onSave(draft)} />
        </ModalActions>
      </Stack>
    </Modal>
  );
}

/* The live preview under the paths: the leaf count against the cap, then each path
   in plain words. */
function PolicyPreview({ paths, keys = MUSIG_KEYS }) {
  const leaves = paths.reduce((sum, p) => sum + pathLeaves(p, keys), 0);
  return (
    <Card tone="inset" pad="m">
      <Stack gap="xs">
        <SectionLabel>Policy</SectionLabel>
        <Text variant="body">{leaves} of {MUSIG_MAX_LEAVES} tap leaves</Text>
        {paths.map((p, i) => <Text key={i} variant="body">Spend Path {i + 1}: {pathWords(p, keys)}</Text>)}
      </Stack>
    </Card>
  );
}

/* Backup Descriptor: the native save dialog (showSaveFilePicker) with the account
   name as the file name; where the browser has none, a plain download. Resolves
   true once written, false when the user cancels. Qt: QFileDialog::getSaveFileName,
   then the bip138 crate encrypts the descriptor to its keys (any cosigner's xpub
   decrypts it); the kit writes a stand-in with the BIP138 magic, it encrypts nothing. */
async function saveDescriptorFile(name) {
  const fileName = `${name || 'account'}.bip138`;
  const blob = new Blob(['BIP138'], { type: 'application/octet-stream' });
  if (window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'BIP138 backups', accept: { 'application/octet-stream': ['.bip138'] } }] });
      const w = await h.createWritable(); await w.write(blob); await w.close();
      return true;
    } catch (e) { if (e && e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName; a.click(); URL.revokeObjectURL(a.href);
  return true;
}

/* Review: the policy only — each path's signers in words, its timelock, and its
   keys (alias, fingerprint, mandatory). The descriptor is not shown; the wizard's
   Review step backs it up right under the policy. */
function PolicyReview({ paths, keys = MUSIG_KEYS }) {
  return (
    <Stack gap="s" style={{ alignSelf: 'stretch' }}>
      {paths.map((p, i) => (
        <Card key={i} tone="inset" pad="m">
          <Stack gap="xxs">
            <Text variant="section">{pathTitle(p, i)}: {signerWords(p, keys)}</Text>
            <Text variant="caption">{lockLine(p)}</Text>
            {pathKeys(p, keys).map(k => (
              <Row key={k.fp} gap="s">
                <Text variant="body">{k.alias}</Text>
                <Text variant="mono" color="muted">{k.fp}</Text>
                {(p.mandatory || []).includes(k.fp) ? <Text variant="caption">Mandatory</Text> : null}
              </Row>
            ))}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

/* Routes whose device has a screen that can show an address. */
const SHOWS_ADDRESS = { qr: true, usb: true };

/* The verify page: the first receive address flush with its lead, then one row per
   signer of the policy. A click on a signer with a screen sends it the address at
   once, no signer picker: a USB device shows it with no window, its row On Device
   until it answers (`checking`), every device at once; a QR one opens its QR step.
   Verified once it matched, Mismatch when the device showed another address,
   Failed with why on its row (`failed`: { fingerprint: why }); the others read No
   Screen. With no signer able to show it, the warning instead. */
function VerifyFirstAddress({ signers = [], verified = [], checking = [], mismatched = [], failed = {}, onCheck }) {
  const checkable = signers.filter(k => SHOWS_ADDRESS[k.route]);
  return (
    <Stack gap="m" style={{ alignSelf: 'stretch' }}>
      <Text variant="body">{checkable.length ? 'Optionally, check this address on your signing devices: click a signer.'
        : 'This is the first receive address of the wallet.'}</Text>
      <Row justify="center"><Card tone="inset" pad="m"><ChunkedAddress text={MUSIG_ADDRESS} oneRow /></Card></Row>
      <Stack gap="xs">
        {signers.map(k => {
          const can = !!SHOWS_ADDRESS[k.route], done = verified.includes(k.fp), busy = checking.includes(k.fp);
          const mismatch = mismatched.includes(k.fp);
          /* a device that did not confirm says why on its own row, and stays clickable */
          const why = can && !done && !busy ? (mismatch ? 'The device showed another address: do not use this one' : failed[k.fp]) : null;
          return (
            <SelectRow key={k.fp} icon={ROUTE_KINDS[k.route].icon} title={k.alias} sub={why || k.fp} chevron={false}
              tone={why ? 'error' : undefined} disabled={!can}
              status={<Pill id={!can ? 'addr_no_screen' : done ? 'addr_verified' : busy ? 'musig_on_device' : mismatch ? 'addr_mismatch' : why ? 'reg_failed' : 'addr_unchecked'} />}
              onClick={can && !done && !busy ? () => onCheck && onCheck(k.fp) : undefined} />
          );
        })}
      </Stack>
      {!checkable.length ? (
        <Notice tone="warning" title="The address is not checked">
          No key of this wallet is on a device with a screen (USB or QR): none can show this address. Create the wallet only if you trust this computer.
        </Notice>
      ) : null}
    </Stack>
  );
}

/* Create Multikey Account: a wizard, one step per page under a WizardSteps trail.
   Spend Paths (network, one row per path opening Edit Spend Path) → Xpubs (every key
   of the paths, fetched or missing; a missing USB key gives it on click with no
   window, its row On Device until it answers; another route opens that key's
   signing flow; skipped when none is missing) →
   Review (account name, the policy, Backup Descriptor right under it) → Register
   (one row per signer; a device registers on click, hot keys need none) → Verify (the first address on a device) → Electrum (the server, SSL, certificate check;
   Create).
   Xpubs, Register and Verify ask every device at once: each row is clicked on its own,
   a key busy on one request is not clickable until it answers.
   Back on every step but the first.
   `initial.step`: paths | xpubs | review | register | verify | account; `initial.fetching`:
   fingerprints whose USB device is giving its xpub; `initial.registered`
   / `initial.registering`: fingerprints registered / in progress; `initial.registerFailed`:
   { fingerprint: why its device failed to register }, shown on its row until clicked again;
   `initial.privacyMode` false: the backup's privacy mode unticked (ticked by default); `initial.backupExcluded`: the
   keys the BIP138 backup left out, named once backed up;
   `initial.editing`: a path index open in Edit Spend Path; `initial.checkable` false
   shows the no-checkable-key warning; `initial.verified` the matched check; `initial.checking`
   the devices showing the address now; `initial.mismatched` those that showed another;
   `initial.verifyFailed`: { fingerprint: why its device did not answer }. */
const CREATE_STEPS = ['Spend Paths', 'Xpubs', 'Review', 'Register', 'Verify', 'Electrum'];
const CREATE_STEP_INDEX = { paths: 0, xpubs: 1, review: 2, register: 3, verify: 4, account: 5 };
/* Routes whose device holds a registration of the account (hot keys need none). */
const NEEDS_REGISTER = { qr: true, usb: true, sd: true };

function CreateSharedAccount({ existing = [], keys = MUSIG_KEYS, onCancel, onCreate, initial = {} }) {
  const [step, setStep] = React.useState(initial.step || 'paths');
  const [name, setName] = React.useState(initial.name || 'shared');
  const [network, setNetwork] = React.useState('Regtest');
  const [electrum, setElectrum] = React.useState(REGTEST_ELECTRUM_URL);
  const [test, setTest] = React.useState(initial.test === undefined ? 'ok' : initial.test);
  /* Electrum transport: SSL, and the certificate check (off for a self-signed one) */
  const [ssl, setSsl] = React.useState(initial.ssl === undefined ? true : initial.ssl);
  const [verifyCert, setVerifyCert] = React.useState(initial.verifyCert === undefined ? true : initial.verifyCert);
  const [paths, setPaths] = React.useState(initial.paths || [MUSIG_PATH]);
  const [fetched, setFetched] = React.useState(initial.fetched || ['28645006', 'b8688df1']);
  const [fetching, setFetching] = React.useState(initial.fetching || []);
  const [flow, setFlow] = React.useState(null);   // null | { fetch: fp } | { verify: fp }
  const [editing, setEditing] = React.useState(initial.editing === undefined ? null : initial.editing);   // path index | null
  /* fingerprints whose device showed the same address; `initial.verified` true = every signer with a screen */
  const [verified, setVerified] = React.useState(Array.isArray(initial.verified) ? initial.verified
    : initial.verified ? keys.filter(k => SHOWS_ADDRESS[k.route]).map(k => k.fp) : []);
  const [backedUp, setBackedUp] = React.useState(!!initial.backedUp);
  /* fingerprints registered; `registering` those in progress, every device at once */
  const [registered, setRegistered] = React.useState(initial.registered || []);
  const [registering, setRegistering] = React.useState(initial.registering || []);
  /* the Verify step: devices showing the address now, those that showed another, failures */
  const [checking, setChecking] = React.useState(initial.checking || []);
  const [mismatched, setMismatched] = React.useState(initial.mismatched || []);
  const [verifyFailed, setVerifyFailed] = React.useState(initial.verifyFailed || {});
  const [registerFailed, setRegisterFailed] = React.useState(initial.registerFailed || {});
  /* on by default: the backup's clear part names no derivation path unless asked to */
  const [privacyMode, setPrivacyMode] = React.useState(initial.privacyMode !== false);
  const backupExcluded = initial.backupExcluded || [];
  /* the Register step's opt-out: continue with devices left unregistered */
  const [skipRegister, setSkipRegister] = React.useState(!!initial.skipRegister);
  /* Xpubs is skipped when every key of the paths already gave its xpub; Back from Review then returns to Spend Paths */
  const [skippedXpubs, setSkippedXpubs] = React.useState(false);
  const checkable = initial.checkable !== false;

  const used = keys.filter(k => paths.some(p => p.keys[k.fp]));
  const missing = used.filter(k => !fetched.includes(k.fp));
  const trimmed = name.trim();
  /* a key answers one request at a time, whichever step it is for */
  const busy = fp => fetching.includes(fp) || registering.includes(fp) || checking.includes(fp);
  const without = fp => list => list.filter(x => x !== fp);
  /* a USB device answers with no window: its row On Device until it does */
  const fetchOnDevice = fp => {
    setFetching(f => [...f, fp]);
    setTimeout(() => { setFetched(f => [...f, fp]); setFetching(without(fp)); }, 900);
  };
  const checkOnDevice = fp => {
    setMismatched(without(fp));
    setVerifyFailed(f => { const n = { ...f }; delete n[fp]; return n; });
    setChecking(c => [...c, fp]);
    setTimeout(() => { setVerified(v => [...v, fp]); setChecking(without(fp)); }, 900);
  };
  const leaves = paths.reduce((sum, p) => sum + pathLeaves(p, keys), 0);

  if (flow && flow.fetch) {
    const key = keys.find(k => k.fp === flow.fetch);
    return <SigningFlow context="fetch-xpub" keyRow={{ fp: key.fp, alias: key.alias, route: key.route }}
      onCancel={() => setFlow(null)}
      onDone={() => { setFetched(f => [...f, key.fp]); setFlow(null); }} />;
  }
  if (editing !== null) {
    const isNew = editing >= paths.length;
    const path = isNew ? MUSIG_NEW_PATH : paths[editing];
    return <EditSpendPath key={editing} index={editing + 1} path={path} keys={keys}
      removable={!isNew && paths.length > 1} onClose={onCancel} onBack={() => setEditing(null)}
      onRemove={() => { setPaths(paths.filter((_, k) => k !== editing)); setEditing(null); }}
      onSave={np => { setPaths(isNew ? [...paths, np] : paths.map((x, k) => (k === editing ? np : x))); setEditing(null); }} />;
  }
  if (flow && flow.verify) {
    // The clicked key's own route, no signer picker. The kit treats closing the result
    // as the device's match.
    const key = keys.find(k => k.fp === flow.verify);
    return <SigningFlow context="verify" keyRow={{ fp: key.fp, alias: key.alias, route: key.route }} address={MUSIG_ADDRESS}
      onCancel={() => { setVerified(v => (v.includes(flow.verify) ? v : [...v, flow.verify])); setFlow(null); }} />;
  }

  let body, actions, foot = null;
  if (step === 'paths') {
    const reason = leaves === 0 ? 'Pick the keys of each path.' : null;
    body = (
      <Stack gap="m" style={{ alignSelf: 'stretch' }}>
        <Row><Spacer /><Field label="Network:"><ComboBox value={network} options={NETWORKS} onChange={setNetwork} width={240} /></Field></Row>
        <SpendPathList paths={paths} keys={keys} onOpen={setEditing} onAdd={() => setEditing(paths.length)} />
      </Stack>
    );
    actions = (
      <ModalActions reason={reason}>
        <Btn id="continue" disabled={!!reason} onClick={() => { const skip = !missing.length; setSkippedXpubs(skip); setStep(skip ? 'review' : 'xpubs'); }} />
      </ModalActions>
    );
  } else if (step === 'xpubs') {
    body = (
      <Stack gap="s" style={{ alignSelf: 'stretch' }}>
        <Text variant="body">Click a missing key to fetch its xpub.</Text>
        <Text variant="caption">{used.length - missing.length} of {used.length} account xpubs fetched</Text>
        <Stack gap="xs">
          {used.map(k => (
            <SelectRow key={k.fp} icon={ROUTE_KINDS[k.route].icon} title={k.alias} sub={k.fp}
              status={<Pill id={fetched.includes(k.fp) ? 'xpub_fetched' : fetching.includes(k.fp) ? 'musig_on_device' : 'xpub_missing'} />}
              chevron={false} onClick={fetched.includes(k.fp) || busy(k.fp) ? undefined
                : k.route === 'usb' ? () => fetchOnDevice(k.fp) : () => setFlow({ fetch: k.fp })} />
          ))}
        </Stack>
      </Stack>
    );
    actions = (
      <ModalActions onBack={() => setStep('paths')}
        reason={missing.length ? `${missing.length} account xpub${missing.length > 1 ? 's' : ''} still missing.` : null}>
        <Btn id="continue" disabled={!!missing.length} onClick={() => setStep('review')} />
      </ModalActions>
    );
  } else if (step === 'review') {
    /* the account is named here: the descriptor backup takes its name */
    const nameReason = !trimmed ? 'Enter an account name.'
      : existing.includes(trimmed) ? `An account named “${trimmed}” already exists.` : null;
    const reason = nameReason || (backedUp ? null : 'Back up the descriptor first.');
    body = (
      <Stack gap="m" style={{ alignSelf: 'stretch' }}>
        <FieldGroup>
          <Field label="Account Name:"><Input width={240} value={name} onChange={e => { setName(e.target.value); setBackedUp(false); }} /></Field>
        </FieldGroup>
        <PolicyReview paths={paths} keys={keys} />
        <Stack gap="s">
          <Row gap="s">
            {/* privacy mode on the button's row: it sets what the button saves */}
            <Row gap="xs"><Checkbox checked={privacyMode} onChange={setPrivacyMode} label="Privacy mode" />
              <InfoTip label="Leaves the common derivation paths out of the backup's clear part: whoever finds the file learns less, a restore then looks for the paths itself." /></Row>
            <Spacer />
            {backedUp ? <Text variant="caption" color="success">Descriptor backed up.</Text> : null}
            <Btn id={backedUp ? 'backup_descriptor' : 'backup_descriptor_primary'} disabled={!!nameReason}
              onClick={() => saveDescriptorFile(trimmed).then(ok => ok && setBackedUp(true))} />
          </Row>
          {/* BIP138 names each key it leaves out of the encryption keys: its holder cannot decrypt */}
          {backedUp && backupExcluded.length ? (
            <Text variant="caption" color="warning">Left out of the backup, so their holders cannot decrypt it with them: {backupExcluded.join(', ')}</Text>
          ) : null}
        </Stack>
      </Stack>
    );
    actions = (
      <ModalActions onBack={() => setStep(skippedXpubs ? 'paths' : 'xpubs')} reason={reason}>
        <Btn id="continue" disabled={!!reason} onClick={() => setStep('register')} />
      </ModalActions>
    );
  } else if (step === 'register') {
    /* one row per signer: a device registers the account on click; hot keys need none */
    const need = used.filter(k => NEEDS_REGISTER[k.route]);
    const left = need.filter(k => !registered.includes(k.fp));
    /* a click tries again after a failure, the failure cleared until it answers */
    const register = (fp) => {
      setRegisterFailed(f => { const n = { ...f }; delete n[fp]; return n; });
      setRegistering(r => [...r, fp]); setTimeout(() => { setRegistered(r => [...r, fp]); setRegistering(without(fp)); }, 900);
    };
    body = (
      <Stack gap="s" style={{ alignSelf: 'stretch' }}>
        <Text variant="body">Click a device to register the account on it.</Text>
        <Stack gap="xs">
          {used.map(k => {
            const needs = !!NEEDS_REGISTER[k.route], done = registered.includes(k.fp), on = registering.includes(k.fp);
            /* a failed device says why on its own row, in words, and stays clickable */
            const failed = needs && !done && !on ? registerFailed[k.fp] : null;
            return (
              <SelectRow key={k.fp} icon={ROUTE_KINDS[k.route].icon} title={k.alias} sub={failed || k.fp} chevron={false}
                tone={failed ? 'error' : undefined} disabled={!needs}
                status={<Pill id={!needs ? 'reg_not_needed' : done ? 'reg_registered' : on ? 'reg_registering' : failed ? 'reg_failed' : 'reg_pending'} />}
                onClick={needs && !done && !busy(k.fp) ? () => register(k.fp) : undefined} />
            );
          })}
        </Stack>
      </Stack>
    );
    /* sits at the bottom, right above the button bar */
    foot = left.length ? (
      <Checkbox checked={skipRegister} onChange={setSkipRegister}
        label="Skip: continue without registering every device (register them later from the Keys tab)" />
    ) : null;
    const reason = registering.length ? 'Registering…'
      : left.length && !skipRegister ? `${left.length} device${left.length > 1 ? 's' : ''} still to register.` : null;
    actions = (
      <ModalActions onBack={registering.length ? null : () => setStep('review')} reason={reason}>
        <Btn id="continue" disabled={!!reason} onClick={() => setStep('verify')} />
      </ModalActions>
    );
  } else if (step === 'account') {
    /* last: the Electrum server the account syncs through, then Create */
    const reason = test !== 'ok' ? 'Test the Electrum server first.' : null;
    body = (
      <Stack gap="m" style={{ alignSelf: 'stretch' }}>
        <Text variant="body">An Electrum server is needed to fetch the on-chain history.</Text>
        <Notice tone="warning" title="Use your own Electrum server">
          A server run by someone else sees every address and transaction of this account.
        </Notice>
        <FieldGroup gap="s">
          <EndpointRow label="Electrum:" value={electrum} onChange={v => { setElectrum(v); setTest(null); }}
            test={test} onTest={() => { setTest('testing'); setTimeout(() => setTest('ok'), 700); }} />
          <Field label="SSL:"><Toggle on={ssl} onClick={() => { setSsl(!ssl); setTest(null); }} /></Field>
          <Field label={<Row gap="xs">Verify Certificate: <InfoTip label="Turn off for a server with a self-signed certificate." /></Row>}>
            <Toggle on={ssl && verifyCert} disabled={!ssl} onClick={() => { setVerifyCert(!verifyCert); setTest(null); }} />
          </Field>
        </FieldGroup>
      </Stack>
    );
    actions = (
      <ModalActions onBack={() => setStep('verify')} reason={reason}>
        <Btn id="create" disabled={!!reason} onClick={() => onCreate && onCreate(trimmed)} />
      </ModalActions>
    );
  } else {
    const signers = checkable ? used : used.map(k => ({ ...k, route: 'hot' }));
    body = <VerifyFirstAddress signers={signers} verified={verified} checking={checking} mismatched={mismatched} failed={verifyFailed}
      onCheck={fp => (busy(fp) ? null : keys.find(k => k.fp === fp).route === 'usb' ? checkOnDevice(fp) : setFlow({ verify: fp }))} />;
    /* optional: Continue is always open */
    actions = (
      <ModalActions onBack={() => setStep('register')}>
        <Btn id="continue" onClick={() => setStep('account')} />
      </ModalActions>
    );
  }
  return (
    <Modal title="Create Multikey Account" width={760} height="wizard" onClose={onCancel}>
      <Stack gap="m" style={{ alignSelf: 'stretch', flex: 1 }}>
        <WizardSteps steps={CREATE_STEPS} current={CREATE_STEP_INDEX[step]} />
        {body}
        <Spacer />
        {foot}
        {actions}
      </Stack>
    </Modal>
  );
}

/* MuSig2 Sign: a wizard opened by Sign on a Multikey Send. Nonces (round 1) →
   Partial Signatures (round 2), which ends on Broadcast. Each round lists the spend path's
    cosigners; a cosigner adds its part on click (its device, briefly "On Device…",
    or a hot key, "Signing…" after its password window closes),
   every cosigner at once: the others stay clickable while one is on its device.
   Continue opens once every cosigner is in. Rounds cannot go back (a nonce is spent),
   so there is no Back; the header × closes and keeps the session, Sign Round N on
   the Send card reopens it. `lost`: signing waits for a confirmed Reset.
   `round`: 1 | 2 | 'ready'; onRound(r) mirrors progress to the Send card.
   Every key of the wallet has a row: the path's signers that can sign first, then
   those that cannot, then the wallet's keys the path does not use, then the connected
   devices that are no key of the wallet. Each greyed row says why on its row, just
   left of its pill: `offline` (fingerprints, Not Connected), `unsupported` (fingerprints
   whose device cannot sign MuSig2, Unsupported), `others` (Not in Path), `strangers`
   (connected devices, Not in Wallet). `single`: a single-key path (a timelocked one)
   signs once, no rounds. */
const SIGN_WHY = {
  offline: 'Its device is not connected: plug it in and unlock it.',
  unsupported: 'Its device cannot sign MuSig2.',
  others: 'Not a signer of this spend path.',
  strangers: 'Not a key of this wallet.',
};
const MUSIG_SIGN_STEPS = ['Nonces', 'Partial Signatures'];

function ConfirmSigningReset({ onCancel, onConfirm }) {
  React.useEffect(() => {
    const dismiss = e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', dismiss, true);
    return () => document.removeEventListener('keydown', dismiss, true);
  }, [onCancel]);
  return <Modal title="Reset signing?" onClose={onCancel}>
    <Text variant="body">{PSBT_RESET_MESSAGE}</Text>
    <ModalActions>
      <Btn id="cancel" onClick={onCancel} />
      <Btn id="confirm_reset_signing" onClick={onConfirm} />
    </ModalActions>
  </Modal>;
}

function MusigSignModal({ signers, others = [], offline = [], unsupported = [], strangers = [], single = false, round = 1, lost = false, finalized = false, saveWarning = '', txid = MUSIG_TXID, initial = {}, onRound, onProgress, onBroadcast, onClose }) {
  const [r, setR] = React.useState(finalized ? 'ready' : single ? 2 : round);
  const [restartNeeded, setRestartNeeded] = React.useState(lost);
  const [done, setDone] = React.useState(initial.done || (round === 2 && !finalized ? { 1: signers.map(s => s.fp) } : round === 'ready' || finalized ? { 1: signers.map(s => s.fp), 2: signers.map(s => s.fp) } : {}));
  const [confirmReset, setConfirmReset] = React.useState(!!initial.confirmReset);
  /* UI snapshots only; the app archives exact PSBTs in encrypted storage. */
  const [attempt, setAttempt] = React.useState({ attemptId: initial.attemptId || 0,
    baseline: initial.baseline || { done: {} }, archivedAttempts: initial.archivedAttempts || [] });
  /* the cosigners on their device now: every one can be asked at once */
  const [busy, setBusy] = React.useState([].concat(initial.busy || []));
  const [hotPrompt, setHotPrompt] = React.useState(null);
  /* the cosigners holding a usable session in the nonce cache, bound to no transaction */
  const [prepared, setPrepared] = React.useState(initial.cached || []);
  /* the first signature request took every required session for this attempt (a
     resumed round 2 or a lost session did before): only from then on Reset exists */
  const [taken, setTaken] = React.useState(!!initial.allocated || lost
    || (!single && !finalized && (round === 2 || round === 'ready')));
  /* 'ready' (every partial signature in) stays on step 2, its button Broadcast */
  const sr = r === 'ready' ? 2 : r;
  const stepIdx = sr - 1;
  const inRound = (done[sr] || []);
  /* on the Nonces step a cosigner whose session is cached has nothing to do */
  const isCached = s => sr === 1 && !inRound.includes(s.fp) && prepared.includes(s.fp);
  const left = signers.filter(s => !inRound.includes(s.fp) && !isCached(s));
  /* the signers that can sign ahead of those that cannot */
  const blocked = s => !inRound.includes(s.fp) && (offline.includes(s.fp) || unsupported.includes(s.fp));
  const usable = signers.filter(s => !blocked(s));
  const unusable = signers.filter(s => !usable.includes(s));
  /* every signer still owing its nonces holds a cached session: the Nonces step has
     nothing to prepare and the wizard moves on, taking no session */
  React.useLayoutEffect(() => {
    const owing = usable.filter(s => !inRound.includes(s.fp));
    if (sr === 1 && !single && owing.length && owing.every(s => prepared.includes(s.fp))) setR(2);
  }, [prepared, sr]);
  React.useEffect(() => {
    onProgress && onProgress({ ...attempt, done, lost: restartNeeded });
    if (sr === 2 && r !== 'ready' && signers.every(s => (done[2] || []).includes(s.fp))) {
      setR('ready'); onRound && onRound('ready');
    }
  }, [done, attempt, restartNeeded]);
  /* the first signature request takes every required session at once: every nonce
     is in, the Send card moves to round 2 and Reset appears */
  const takeSessions = () => {
    if (single || taken) return;
    setTaken(true);
    setDone(d => ({ ...d, 1: signers.map(s => s.fp) }));
    onRound && onRound(2);
  };
  /* on the Nonces step a click prepares one cached session, bound to no transaction */
  const add = (fp) => { if (sr === 2) takeSessions(); setBusy(b => [...b, fp]); setTimeout(() => {
    if (sr === 1) setPrepared(p => [...p, fp]);
    else setDone(d => ({ ...d, [sr]: [...(d[sr] || []), fp] }));
    setBusy(b => b.filter(x => x !== fp));
  }, 900); };
  /* Continue only changes the step shown: no session is taken */
  const next = () => setR(2);
  const reset = () => {
    setAttempt({ attemptId: attempt.attemptId + 1, baseline: { done: {} },
      archivedAttempts: [...attempt.archivedAttempts, { txid, attemptId: attempt.attemptId, baseline: attempt.baseline, done, round: r }] });
    setDone({}); setR(single ? 2 : 1); setRestartNeeded(false);
    setPrepared([]); setTaken(false);
    setConfirmReset(false);
    onRound && onRound(single ? 2 : 1);
  };

  let body, actions;
  {
    const what = single ? 'its signature' : sr === 1 ? 'its nonce' : 'its partial signature';
    body = (
      <Stack gap="s" style={{ alignSelf: 'stretch' }}>
        {restartNeeded ? (
          <Notice tone="warning" title="MuSig2 session missing or mismatch">
            {PSBT_RESTART_MESSAGE}
          </Notice>
        ) : null}
        {saveWarning ? <Text variant="caption">{psbtSaveWarning(saveWarning)}</Text> : null}
        <Text variant="body">{single ? `Click the cosigner to add ${what}.` : `Click each cosigner to add ${what}.`}</Text>
        <Stack gap="xs">
          {usable.map(s => {
            const ok = inRound.includes(s.fp), on = busy.includes(s.fp), cachedRow = isCached(s);
            return (
              <SelectRow key={s.fp} icon={ROUTE_KINDS[s.route].icon} title={s.alias} sub={s.fp} chevron={false}
                 status={<Pill id={ok ? (sr === 1 ? 'musig_nonce_added' : 'signer_signed') : on ? (s.route === 'hot' ? 'musig_signing' : 'musig_on_device') : cachedRow ? 'musig_cached' : 'musig_needed'} />}
                 disabled={restartNeeded}
                 onClick={!restartNeeded && !ok && !on && !cachedRow ? () => s.route === 'hot' ? setHotPrompt(s) : add(s.fp) : undefined} />
            );
          })}
          {unusable.map(s => {
            const off = offline.includes(s.fp);
            return (
              <SelectRow key={s.fp} icon={ROUTE_KINDS[s.route].icon} title={s.alias} chevron={false} disabled
                sub={s.fp} note={off ? SIGN_WHY.offline : SIGN_WHY.unsupported}
                status={<Pill id={off ? 'signer_disconnected' : 'signer_unsupported'} />} />
            );
          })}
          {others.map(s => (
            <SelectRow key={s.fp} icon={ROUTE_KINDS[s.route].icon} title={s.alias} sub={s.fp} note={SIGN_WHY.others} chevron={false} disabled
              status={<Pill id="signer_not_in_path" />} />
          ))}
          {strangers.map(s => (
            <SelectRow key={s.fp} icon={ROUTE_KINDS.usb.icon} title={s.alias} sub={s.fp} note={SIGN_WHY.strangers} chevron={false} disabled
              status={<Pill id="signer_not_in_wallet" />} />
          ))}
        </Stack>
      </Stack>
    );
    const reason = busy.length ? (busy.some(fp => signers.some(s => s.fp === fp && s.route !== 'hot')) ? 'On the device…' : 'Signing…') : left.length ? `${left.length} cosigner${left.length > 1 ? 's' : ''} still to go.` : null;
    actions = (
      <ModalActions reason={reason} leading={taken ? <Btn id="reset_signing" disabled={!!busy.length} onClick={() => setConfirmReset(true)} /> : null}>
        {sr === 1 ? <Btn id="continue" disabled={restartNeeded || !!reason} onClick={next} />
          : <Btn id="broadcast" disabled={restartNeeded || !!reason} onClick={onBroadcast} />}
      </ModalActions>
    );
  }
  return (
    <Modal title="Sign" width={760} height="wizard" onClose={onClose}>
      <Stack gap="m" style={{ alignSelf: 'stretch', flex: 1 }}>
        {single ? null : <WizardSteps steps={MUSIG_SIGN_STEPS} current={stepIdx} />}
        {body}
        <Spacer />
        {actions}
      </Stack>
      {hotPrompt && sr === 1 ? <UnsealModal title="Prepare Nonce Cache" prompt={`Enter the password of “${hotPrompt.alias}” to prepare a nonce session.`} proceedId="prepare_nonces" closeOnSubmit onCancel={() => setHotPrompt(null)} onDone={() => { setPrepared(p => [...p, hotPrompt.fp]); setHotPrompt(null); }} /> : null}
      {hotPrompt && sr === 2 ? <UnsealModal title="Sign Transaction" prompt={`Enter the password of “${hotPrompt.alias}” to sign the transaction.`} proceedId="sign_hot" closeOnSubmit onCancel={() => setHotPrompt(null)} onDone={() => { add(hotPrompt.fp); setHotPrompt(null); }} /> : null}
      {confirmReset ? <ConfirmSigningReset onCancel={() => setConfirmReset(false)} onConfirm={reset} /> : null}
    </Modal>
  );
}

/* A Multikey wallet's cosigners (fingerprints) as signer rows, named from MUSIG_KEYS. */
const musigSigners = (fps) => fps.map(fp => MUSIG_KEYS.find(k => k.fp === fp) || { fp, alias: fp, route: 'qr' });

/* Spend path leaves of the selected coins, by their signers' aliases. */
const MUSIG_LEAVES = ['Carol + Alice', 'Carol + Bob', 'Alice + Bob', 'Dave after 4320 blocks (locked)'];
/* the paths a timelock still holds for the picked coins */
const MUSIG_LOCKED_LEAVES = ['Dave after 4320 blocks (locked)'];

/* A path its timelock still holds is listed greyed out and cannot be picked. */
/* `width`: the Send panel passes '100%', as wide as the coins table above it. */
function SpendPathPicker({ leaves = MUSIG_LEAVES, lockedLeaves = MUSIG_LOCKED_LEAVES, value = 'Alice + Bob', locked = false, onChange, width = 400 }) {
  const [picked, setPicked] = React.useState(value);
  return (
    <Stack gap="xs">
      <SectionLabel>Spend path</SectionLabel>
      <ComboBox value={onChange ? value : picked} options={leaves} disabledOptions={lockedLeaves} disabled={locked}
        onChange={onChange || setPicked} width={width} />
    </Stack>
  );
}

/* Register Descriptor (a Multikey account's Settings): one row per key of the wallet.
   On open each key on its connected USB device is asked whether it holds the account
   (Checking…, then Registered or Not Registered), registering nothing. A click registers
   on that device, every device at once; a failure says why on its row and a click tries
   again; a device not connected is greyed (Not Connected, why left of its pill) and
   checked again on click; a key with no device to register on reads Not Needed.
   `initial.states`: { fp: 'checking' | 'registered' | 'pending' | 'registering' |
   'failed' | 'disconnected' | 'not_needed' }; `initial.failed`: { fp: why }. */
const REGISTER_PILL = { not_needed: 'reg_not_needed', disconnected: 'signer_disconnected', checking: 'reg_checking',
  pending: 'reg_pending', registering: 'reg_registering', registered: 'reg_registered', failed: 'reg_failed' };
function RegisterDescriptorModal({ keys = MUSIG_KEYS, initial = {}, onClose }) {
  const opening = () => Object.fromEntries(keys.map(k => [k.fp, k.route === 'hot' ? 'not_needed' : k.route === 'usb' ? 'checking' : 'pending']));
  const [states, setStates] = React.useState(initial.states || opening());
  const [failed, setFailed] = React.useState(initial.failed || {});
  React.useEffect(() => {
    if (initial.states) return undefined;
    const t = setTimeout(() => setStates(s => Object.fromEntries(Object.entries(s).map(([fp, st]) => [fp, st === 'checking' ? 'registered' : st]))), 900);
    return () => clearTimeout(t);
  }, []);
  const set = (fp, st) => setStates(s => ({ ...s, [fp]: st }));
  const click = (fp) => {
    if (states[fp] === 'disconnected') { set(fp, 'checking'); setTimeout(() => set(fp, 'pending'), 900); return; }
    setFailed(f => { const n = { ...f }; delete n[fp]; return n; });
    set(fp, 'registering'); setTimeout(() => set(fp, 'registered'), 900);
  };
  const busy = Object.values(states).some(st => st === 'checking' || st === 'registering');
  return (
    <Modal title="Register Descriptor" width={560} onClose={onClose}>
      <Stack gap="m" style={{ alignSelf: 'stretch' }}>
        <Text variant="body">Click a device to register the account on it.</Text>
        <Stack gap="xs">
          {keys.map(k => {
            const st = states[k.fp], why = st === 'failed' ? failed[k.fp] : null;
            const clickable = st === 'pending' || st === 'failed' || st === 'disconnected';
            return (
              <SelectRow key={k.fp} icon={ROUTE_KINDS[k.route].icon} title={k.alias} sub={why || k.fp} chevron={false}
                tone={why ? 'error' : undefined} disabled={st === 'not_needed'}
                note={st === 'disconnected' ? 'Plug it in and unlock it.' : undefined}
                status={<Pill id={REGISTER_PILL[st]} />} onClick={clickable ? () => click(k.fp) : undefined} />
            );
          })}
        </Stack>
        <ModalActions reason={busy ? 'Registering…' : null}><Btn id="done" onClick={onClose} /></ModalActions>
      </Stack>
    </Modal>
  );
}

const MUSIG_TXID = '501895f3cc36d5e35514b5ff7af55c9b0822e114560ebe6fdab238067db076e2';

const PSBT_RESTART_MESSAGE = 'A signer cannot safely resume its saved nonce session. Choose Reset to archive the current attempt and retire its nonce session before starting again for the same transaction. Consumed or retired nonces cannot be reused.';
const PSBT_RESET_MESSAGE = 'This starts a new signing session for the same transaction and resets active nonces and partial signatures. All participants must use the new attempt. The current PSBT and its baseline will be archived first, but consumed or retired nonce secrets cannot be restored. Reset signing?';
const psbtSaveWarning = message => `The latest transaction progress is not persisted. You can continue signing or broadcasting. ${message}`;

/* Kit records stand in for the app's encrypted PSBT store. No signing or storage here. */
const SAVED_PSBT_TEMPLATE = {
  payments: [{ address: MUSIG_ADDRESS, amount: '0.00500000', label: 'Invoice', max: false }],
  inputs: [{ type: '', outpoint: 'f2c9a1…8b4e:0', label: '', value: '0.01200000' }],
  fee: '280', path: 'Alice + Bob', cosigners: ['73c5da0a', 'b8688df1'],
};
const SAVED_PSBTS = [
  /* reset twice: its active attempt 2, the archived 0 and 1 (oldest first) with their own progress */
  { id: 'partial', txid: MUSIG_TXID, label: 'Invoice', ...SAVED_PSBT_TEMPLATE, round: 2, done: { 1: ['73c5da0a', 'b8688df1'], 2: ['73c5da0a'] }, edited: '2026-10-20 14:32',
    attemptId: 2, archivedAttempts: [{ attemptId: 0, round: 2, done: { 1: ['73c5da0a', 'b8688df1'], 2: ['b8688df1'] } }, { attemptId: 1, round: 1, done: { 1: ['73c5da0a'] } }] },
  { id: 'finalized', txid: '702895f3cc36d5e35514b5ff7af55c9b0822e114560ebe6fdab238067db076e3', label: 'Ready', ...SAVED_PSBT_TEMPLATE, round: 'ready', finalized: true, edited: '2026-10-19 09:15' },
  { id: 'broadcast', txid: '803895f3cc36d5e35514b5ff7af55c9b0822e114560ebe6fdab238067db076e4', label: '', ...SAVED_PSBT_TEMPLATE, round: 'ready', finalized: true, broadcast: true, edited: '2026-10-18 17:48' },
  { id: 'deprecated', txid: 'a15995f3cc36d5e35514b5ff7af55c9b0822e114560ebe6fdab238067db076e6', label: 'Old draft', ...SAVED_PSBT_TEMPLATE, round: 1, done: { 1: ['73c5da0a'] }, edited: '2026-10-15 08:20', conflicts: ['904895f3cc36d5e35514b5ff7af55c9b0822e114560ebe6fdab238067db076e5'] },
  { id: 'confirmed', txid: '904895f3cc36d5e35514b5ff7af55c9b0822e114560ebe6fdab238067db076e5', label: 'Paid', ...SAVED_PSBT_TEMPLATE, round: 'ready', finalized: true, broadcast: true, height: 1219, edited: '2026-10-12 11:03' },
];

/* A cosigner's PSBT, as Import PSBT… reads it in the kit. */
const IMPORTED_PSBT = { id: 'imported', txid: 'b26a95f3cc36d5e35514b5ff7af55c9b0822e114560ebe6fdab238067db076e7', label: '', ...SAVED_PSBT_TEMPLATE, round: 1, done: { 1: ['b8688df1'] }, edited: '2026-11-07 10:04' };

/* compact: the window is under 1040px wide, Last Edited shows the date only.
   Import PSBT… (title right) saves a cosigner's PSBT as one more row, or merges it into
   the row of the same transaction; each row's Export (download icon) hands its PSBT out
   as base64, named after its label, else its txid. `modal`: { type: 'export', record } |
   { type: 'import', result } shown on open.
   A transaction signed in several attempts (Reset) folds: its leading chevron shows one
   sub-row per attempt, the active one first then the archived ones newest first, each
   with its own signatures in. Folded by default; a sub-row opens nothing (the active
   attempt stays). A single attempt has no chevron. `unfolded`: record ids unfolded on open. */
function SavedPsbts({ records = SAVED_PSBTS, compact = false, tip = 0, onOpen, onChange, saveWarning = '', onRetry, error = '', modal: initialModal = null, unfolded: initialUnfolded = [] }) {
  const [confirmed, setConfirmed] = React.useState(false);
  const [deleting, setDeleting] = React.useState(null);
  const [transfer, setTransfer] = React.useState(initialModal);
  /* the kit's account takes the cosigner's PSBT: saved once, merged after */
  const importPsbt = () => {
    const merged = records.some(r => r.id === IMPORTED_PSBT.id);
    if (!merged) onChange && onChange([IMPORTED_PSBT, ...records]);
    setTransfer({ type: 'import', result: merged ? 'merged' : 'saved' });
  };
  /* a broadcast (or confirmed) one is never resumed in Send: it opens in the transaction
     modal, with its warnings / conflicts there too */
  const [viewing, setViewing] = React.useState(null);
  /* a deprecated one: its replacing (conflicting) transaction, in the modal — a saved record
     when there is one, else the conflict as broadcast */
  const showReplacing = r => { const t = r.conflicts[0]; setViewing(records.find(x => x.txid === t) || { ...r, txid: t, conflicts: [], warning: '', broadcast: true, label: '' }); };
  const asTx = r => ({ dir: 'Outgoing', txid: r.txid, height: r.height ? String(r.height) : 'Unconfirmed', date: r.edited, label: r.label,
    amount: (r.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(8),
    notes: [r.warning, ...(r.conflicts || []).map(t => `Conflicting transaction: ${t}`)].filter(Boolean) });
  const [editing, setEditing] = React.useState(null);
  const [draft, setDraft] = React.useState('');
  const commit = r => { onChange && onChange(records.map(row => row.id === r.id ? { ...row, label: draft } : row)); setEditing(null); };
  const remove = record => { onChange && onChange(records.filter(r => r.id !== record.id)); setDeleting(null); };
  const [unfolded, setUnfolded] = React.useState(initialUnfolded);
  const fold = id => setUnfolded(u => u.includes(id) ? u.filter(x => x !== id) : [...u, id]);
  /* the active attempt first, then the archived ones, newest first */
  const attemptsOf = r => [{ ...r, active: true, attemptId: r.attemptId || 0 }, ...[...(r.archivedAttempts || [])].reverse()];
  const rows = records.filter(r => confirmed || !r.height).flatMap(r => [r,
    ...(unfolded.includes(r.id) ? attemptsOf(r).map(a => ({ sub: true, parent: r, attempt: a })) : [])]);
  /* Laid out like the coin list (CoinTable): one clickable row per PSBT, last edited · signatures in/total,
     muted '—' for no label, status pill, right-aligned amount. Row click resumes it. */
  /* partial signatures in (round 2); a finalized PSBT has them all */
  const sigs = r => r.finalized ? (r.cosigners || []).length : r.round === 2 || r.round === 'ready' ? ((r.done || {})[2] || []).length : 0;
  const amount = r => (r.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(8);
  const recordColumns = [
    { header: '', width: 34, icon: true,
      render: r => attemptsOf(r).length > 1 ? <span onClick={e => e.stopPropagation()}><Btn id={unfolded.includes(r.id) ? 'hide_attempts' : 'show_attempts'} onClick={() => fold(r.id)} /></span> : null },
    /* widths fit the content: mono digits are 0.6em (the cell adds its own padding) */
    { header: 'Last Edited', width: DATE_COL_W[compact ? 'compact' : 'full'], mono: true, render: r => <DateStamp value={r.edited} compact={compact} /> },
    { header: 'Signed', width: '3.6em', mono: true, render: r => `${sigs(r)}/${(r.cosigners || []).length}`,
      sub: s => `${sigs(s.attempt)}/${(s.parent.cosigners || []).length}` },
    { header: 'Label', grow: true, muted: r => r.sub || (editing !== r.id && !r.label),
      sub: s => `Attempt ${s.attempt.attemptId + 1}, ${s.attempt.active ? 'active' : 'archived'}`,
      cellStyle: r => editing === r.id ? { padding: '3px 6px' } : null,
      render: r => editing === r.id
        ? <span style={{ width: '100%' }} onClick={e => e.stopPropagation()}><Input value={draft} autoFocus width="100%"
            onChange={e => setDraft(e.target.value)}
            onBlur={() => commit(r)}
            onKeyDown={e => { if (e.key === 'Enter') commit(r); if (e.key === 'Escape') setEditing(null); }} /></span>
        : (r.label || '—') },
    { header: '', width: 34, icon: true,
      render: r => <span onClick={e => e.stopPropagation()}><Btn id="edit_label_row" onClick={() => { setEditing(r.id); setDraft(r.label); }} /></span> },
    { header: 'Status', width: 150, pill: true, render: r => {
      const notes = [r.warning, ...(r.conflicts || []).map(t => `Conflicting transaction: ${t}`)].filter(Boolean);
      return <Row gap="xs"><Pill id={r.height ? 'psbt_confirmed' : (r.conflicts || []).length ? 'psbt_deprecated' : r.broadcast ? 'psbt_unconfirmed' : r.finalized ? 'psbt_ready' : 'psbt_signing'} />{notes.length ? <span onClick={e => { if ((r.conflicts || []).length) { e.stopPropagation(); showReplacing(r); } }} style={{ cursor: (r.conflicts || []).length ? 'pointer' : undefined, display: 'inline-flex' }}><InfoTip label={notes.join('\n')} /></span> : null}</Row>;
    } },
    { header: 'Value', width: 130, align: 'right', render: r => <BtcText btc={amount(r)} /> },
    { header: '', width: 34, icon: true, render: r => <span onClick={e => e.stopPropagation()}><Btn id="export_row" onClick={() => setTransfer({ type: 'export', record: r })} /></span> },
    { header: '', width: 34, icon: true, render: r => <span onClick={e => e.stopPropagation()}><Btn id="delete_row" onClick={() => r.height ? remove(r) : setDeleting(r)} /></span> },
  ];
  /* an attempt sub-row fills Signed and Label only */
  const columns = recordColumns.map(c => ({ ...c, render: (r, i) => r.sub ? (c.sub ? c.sub(r) : null) : c.render(r, i),
    cellStyle: c.cellStyle && (r => r.sub ? null : c.cellStyle(r)) }));
  return <React.Fragment>
    <ScreenWrap title="PSBT" titleRight={<Row gap="m"><Checkbox checked={confirmed} onChange={setConfirmed} label="Show confirmed transactions" /><Btn id="import_psbt" onClick={() => setTransfer({ type: 'import' })} /></Row>}><Stack gap="s">
      {error ? <Text variant="body">{error}</Text> : null}
      {saveWarning ? <React.Fragment>
        <Text variant="body">{psbtSaveWarning(saveWarning)}</Text>
        <Row><Button role="primary" onClick={onRetry}>Retry saving</Button></Row>
      </React.Fragment> : null}
      {rows.length ? <Table columns={columns} rows={rows} rowKey={r => r.sub ? `${r.parent.id}/attempt/${r.attempt.attemptId}` : r.id}
          rowStyle={r => r.sub ? null : { cursor: 'pointer' }}
          onRowClick={r => r.sub ? null : (r.conflicts || []).length ? showReplacing(r) : r.broadcast || r.height ? setViewing(r) : onOpen && onOpen(r)} />
        : !error ? <Text variant="body">No saved PSBTs. Transactions are saved when prepared for signing.</Text> : null}
    </Stack></ScreenWrap>
    {viewing ? <TransactionModal tx={asTx(viewing)} tip={tip} compact={compact} onClose={() => setViewing(null)} /> : null}
    {transfer && transfer.type === 'export' ? <ExportPsbtModal name={transfer.record.label || transfer.record.txid} onClose={() => setTransfer(null)} /> : null}
    {transfer && transfer.type === 'import' ? <ImportPsbtModal key={transfer.result || 'open'} initial={{ result: transfer.result }} onImport={importPsbt} onClose={() => setTransfer(null)} /> : null}
    {deleting ? <Modal title="Delete saved PSBT?" onClose={() => setDeleting(null)}>
      <Text variant="body">This transaction is not confirmed. Delete its saved signing progress? This does not cancel a broadcast transaction.</Text>
      <ModalActions><Btn id="delete" onClick={() => remove(deleting)} /></ModalActions>
    </Modal> : null}
  </React.Fragment>;
}

Object.assign(window, { ConfirmSigningReset, SavedPsbts, SAVED_PSBTS, psbtSaveWarning, MusigSignModal, RegisterDescriptorModal, musigSigners, MUSIG_KEYS, MUSIG_PATH, MUSIG_NEW_PATH, MUSIG_ADDRESS, PathEditor, SpendPathList, EditSpendPath, PolicyPreview, PolicyReview,
  VerifyFirstAddress, CreateSharedAccount, SpendPathPicker, MUSIG_TXID });

/* File-level namespace (DS compiler indexes this file as `Musig`). */
export const Musig = { ConfirmSigningReset, SavedPsbts, MusigSignModal, PathEditor, SpendPathList, EditSpendPath, PolicyPreview, PolicyReview, VerifyFirstAddress, CreateSharedAccount,
  SpendPathPicker };
