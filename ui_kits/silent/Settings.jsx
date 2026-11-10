/* Silent UI Kit — Settings screen (Settings.cpp). */

/* ServerRow composes EndpointRow with height, connection and transport controls.
   A passing fixture test saves the draft and drops the old connection. */
function ServerRow({ label, initial, placeholder, height, connectId, disconnectId, transport = false, lockConnectedElectrum = false }) {
  const [value, setValue] = React.useState(initial);
  const [saved, setSaved] = React.useState({ value: initial, ssl: true, verifyCert: true });
  const [test, setTest] = React.useState(null);
  const [connected, setConnected] = React.useState(true);
  const [ssl, setSsl] = React.useState(true);
  const [verifyCert, setVerifyCert] = React.useState(true);
  React.useEffect(() => {
    setValue(initial); setSaved({ value: initial, ssl: true, verifyCert: true });
    setSsl(true); setVerifyCert(true); setTest(null); setConnected(true);
  }, [initial]);
  const runTest = () => {
    setTest('testing');
    setTimeout(() => {
      if (/localhost:8080/.test(value)) {
        setTest({ error: `Could not reach ${value}: connection refused. Start the BlindBit server, then test again.` });
      } else {
        setTest('ok'); setSaved({ value, ssl, verifyCert }); setConnected(false);
      }
    }, 900);
  };
  const testing = test === 'testing';
  const addressLocked = lockConnectedElectrum && connected;
  const dirty = value !== saved.value || (transport && (ssl !== saved.ssl || (ssl && verifyCert !== saved.verifyCert)));
  return (
    <Stack gap="s">
      <EndpointRow label={label} labelAbove value={value} placeholder={placeholder}
        onChange={v => { setValue(v); setTest(null); }} test={test} onTest={runTest}
        available={!testing} readOnly={addressLocked} testAvailable={dirty} rightControls={
        <Row gap="s">
          {/* The height slot stays while disconnected, so server inputs line up. */}
          <Stack style={{ width: '8em', flex: 'none' }}>{connected && height ? <Text variant="mono" color="secondary">Height {height}</Text> : null}</Stack>
          {connected ? <Btn id={disconnectId} disabled={testing} onClick={() => setConnected(false)} />
            : <Btn id={connectId} disabled={testing || dirty || !saved.value.trim()} onClick={() => setConnected(true)} />}
        </Row>
      } />
      {transport ? (
        <Row gap="l">
          <Field label="SSL:"><Toggle on={ssl} disabled={testing || addressLocked} onClick={() => { setSsl(!ssl); setTest(null); }} /></Field>
          <Field label={<Row gap="xs">Verify Certificate: <InfoTip label="Turn off for a server with a self-signed certificate." /></Row>}>
            <Toggle on={ssl && verifyCert} disabled={testing || !ssl} onClick={() => { setVerifyCert(!verifyCert); setTest(null); }} />
          </Field>
        </Row>
      ) : null}
    </Stack>
  );
}

/* A Multikey Wallet's Settings (core Settings.cpp + musig SettingsExtras.cpp): the
   Electrum ServerRow, Policy (its spend paths; Register Descriptor on the cosigners'
   devices under it), Descriptor (pretty, keys as aliases; copy for backup), then
   Backup (BackupSection). */
function MusigSettingsScreen({ wallet }) {
  const [registering, setRegistering] = React.useState(false);
  const [backingUp, setBackingUp] = React.useState(false);
  React.useEffect(() => { setRegistering(false); setBackingUp(false); }, [wallet]);
  return (
    <ScreenWrap title="Settings" titleRight={<Pill id="network" label={wallet.network} />}>
      <Stack gap="l">
        <ServerRow label="Electrum Address" initial={wallet.electrum} placeholder="host:port (e.g. 127.0.0.1:50001)"
          height={wallet.electrumHeight} connectId="connect_electrum" disconnectId="disconnect_electrum" transport lockConnectedElectrum />
        <Section label="Policy">
          <Stack gap="s">
            <PolicyReview paths={wallet.paths || []} />
            <Row justify="flex-end"><Btn id="register_descriptor" onClick={() => setRegistering(true)} /></Row>
          </Stack>
        </Section>
        <Section label="Descriptor">
          <DescriptorView value={wallet.descriptor}
            aliases={Object.fromEntries(musigSigners(wallet.cosigners.split(', ')).map(s => [s.fp, s.alias]))} />
        </Section>
        <BackupSection onBackup={() => setBackingUp(true)} />
      </Stack>
      {registering && window.RegisterDescriptorModal ? <RegisterDescriptorModal onClose={() => setRegistering(false)} /> : null}
      {backingUp ? <BackupAccountModal account={wallet.name} onClose={() => setBackingUp(false)} /> : null}
    </ScreenWrap>
  );
}

function SettingsScreen({ wallet }) {
  if (wallet.kind === 'musig') {
    return <MusigSettingsScreen wallet={wallet} />;
  }
  return <SpSettingsScreen wallet={wallet} />;
}

/* An sp account's Settings: the BlindBit and Electrum ServerRows (as the Multikey one),
   BlindBit's capabilities under its row, then Backup (BackupSection). The network is a
   pill in the title row (both Settings). */
function SpSettingsScreen({ wallet }) {
  const [backingUp, setBackingUp] = React.useState(false);
  React.useEffect(() => { setBackingUp(false); }, [wallet]);
  return (
    <ScreenWrap title="Settings" titleRight={<Pill id="network" label={wallet.network} />}>
        <Stack gap="l">
          <Stack gap="s">
          <ServerRow label="BlindBit URL" initial={wallet.blindbit} placeholder="https://blindbit.example.com"
            height={wallet.blindbitHeight || wallet.electrumHeight} connectId="connect_blindbit" disconnectId="disconnect_blindbit" />
          {/* what the BlindBit server reports it serves */}
          <Field label="Capabilities:" align="flex-start">
              <Stack gap={2}>
                <Text variant="body">Tweaks Only: Yes</Text>
                <Text variant="body">Full Basic: Yes</Text>
                <Text variant="body">Full + Dust Filter: Yes</Text>
                <Text variant="body">Cut-Through + Dust Filter: No</Text>
              </Stack>
            </Field>
          </Stack>
          <ServerRow label="Electrum Address" initial={wallet.electrum} placeholder="host:port"
            height={wallet.electrumHeight} connectId="connect_electrum" disconnectId="disconnect_electrum" transport />
          <BackupSection onBackup={() => setBackingUp(true)} />
        </Stack>
      {backingUp ? <BackupAccountModal account={wallet.name} onClose={() => setBackingUp(false)} /> : null}
    </ScreenWrap>
  );
}

/* Every account's Settings ends with Backup (core Settings.cpp, sp and Multikey alike): what
   the backup holds, Backup Account right-aligned under it (the Register Descriptor row recipe). */
function BackupSection({ onBackup }) {
  return (
    <Section label="Backup">
      <Stack gap="s">
        <Text as="div" variant="body" color="secondary">Saves this account to a file encrypted with BIP138: its descriptors, servers, address indexes and labels. A Multikey backup opens with any one of its keys and holds no signing secret. A silent payment backup holds the account's scan key and opens only with it, from its key in Keys or its mnemonic. The spending keys are never in it: they stay in Keys.</Text>
        <Row justify="flex-end"><Btn id="backup_account" onClick={onBackup} /></Row>
      </Stack>
    </Section>
  );
}

const backupFile = (account) => `${account}-20261107.bip138`;

/* The key expressions a backup is not encrypted to (Qt: the excluded list of
   IAccountBackend::backupCreated): literal keys, which BIP138 cannot encrypt to. */
const BACKUP_EXCLUDED = ['[28645006]02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5'];

/* Backup Account (Qt: account::view::BackupAccount, ModalWidth::M). Views: save (what the
   BIP138(BIP139) backup is, Save Backup), busy (encrypting; then the system save dialog, not
   drawn), saved (where it is saved, and a warning naming the keys it is not encrypted to).
   `initial`: { view, error, excluded } for the gallery. */
function BackupAccountModal({ account = 'savings', initial = {}, onClose }) {
  const [view, setView] = React.useState(initial.view || 'save');
  const excluded = initial.excluded || [];
  const error = initial.error || null;
  const encrypt = () => {
    setView('busy');
    setTimeout(() => setView('saved'), 900);
  };

  if (view === 'busy') {
    return (
      <Modal title="Backup Account" width={560} onClose={onClose}>
        <ModalStatus spinner pad="var(--space-l) 0" title="Encrypting the backup" subtitle="This takes a moment." />
      </Modal>
    );
  }
  if (view === 'saved') {
    return (
      <Modal title="Backup Account" width={560} onClose={onClose}>
        <Stack gap="m">
          <Notice tone="success">The backup is saved to /home/alice/{backupFile(account)}</Notice>
          {/* BIP138 asks that the user knows which key cannot open the backup */}
          {excluded.length ? <Notice tone="warning">The backup is not encrypted to these keys, so their holders cannot open it with them: {excluded.join(', ')}</Notice> : null}
          <ModalActions><Btn id="done" onClick={onClose} /></ModalActions>
        </Stack>
      </Modal>
    );
  }
  return (
    <Modal title="Backup Account" width={560} onClose={onClose}>
      <Stack gap="m">
        <Text as="div" variant="body" color="secondary">The backup is a BIP139 wallet backup encrypted with BIP138. It holds the account's descriptors, servers, address indexes and labels. A Multikey backup is encrypted to the policy's keys: any one of them opens it, from its signing device, its xpub or its mnemonic, and it holds no signing secret. A silent payment backup holds the account's scan key and is encrypted to it: only that key opens it, from its key in Keys or its mnemonic, and whoever opens it sees the account's payments. The spending keys are never in a backup.</Text>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <ModalActions>
          <Btn id="save_backup" onClick={encrypt} />
        </ModalActions>
      </Stack>
    </Modal>
  );
}

/* What a read backup says (Qt: backend::BackupInfo, from the account backup's contents):
   one fixture per account kind, the servers and keys of the Data.jsx accounts. `paths`: the
   derivation paths of the keys it is encrypted to (Qt: IAccountBackend::backupLocked), none
   for a plain backup; an SP backup names its BIP352 scan path alone, as it opens only with
   a silent payment scan key. `network` null: a descriptor whose test keys leave it unsaid. */
const BACKUP_INFO = {
  sp: {
    account: 'savings', kind: 'Silent Payment Wallet', network: 'Signet',
    paths: ["m/352'/1'/0'/1'/0"],
    includes: [
      "The silent payment descriptor, with its scan key: whoever opens the backup sees the account's payments",
      'Server: https://blindbit.silentpayments.dev',
      'Server: signet.electrum.silent:50001',
      'Segwit addresses handed out: 2 receive, 0 change',
      'Scanning starts at block 809500',
      'Labels: 4',
    ],
    requirements: [
      'The signing keys 73c5da0a, in Keys, to spend: the backup holds the scan key, not the spending key',
      'Its coins and history are found again by scanning from block 809500',
    ],
    warnings: [],
  },
  musig: {
    account: 'multikey', kind: 'Multikey Wallet', network: 'Regtest',
    paths: ["m/87'/1'/0'", "m/48'/1'/0'/2'"],
    includes: [
      'The spending policy (descriptor)',
      'Server: minta.wizardsardine.com:60001',
      'Taproot addresses handed out: 2 receive, 1 change',
      'Labels: 2',
    ],
    requirements: [
      'The signing keys 73c5da0a, b8688df1, in Keys: the backup holds no secret',
      'Its coins and history are found again from the Electrum server',
    ],
    warnings: ['Saved PSBTs and signing sessions are not in the backup: a transaction being signed is prepared again.'],
  },
  descriptor: {
    account: '', kind: 'Multikey Wallet', network: null,
    paths: [],
    includes: [
      'The spending policy (descriptor)',
      'Labels: 0',
    ],
    requirements: [
      'The signing keys 73c5da0a, b8688df1, 28645006, in Keys: the backup holds no secret',
      'Its coins and history are found again from the Electrum server',
      'Servers: the backup names none, so the restored account uses the ones last used on its network. Change them in its Settings.',
    ],
    warnings: ['Saved PSBTs and signing sessions are not in the backup: a transaction being signed is prepared again.'],
  },
};

/* The networks a backup that leaves its network unsaid can be of: only test keys do. */
const RESTORE_NETWORKS = ['Signet', 'Testnet', 'Regtest'];

/* A BIP352 scan path, m/352'/coin'/account'/1'/0, its coin captured (Qt: SCAN_PATH_RE). */
const SCAN_PATH_RE = /^m\/352'\/(\d+)'\/\d+'\/1'\/0$/;

/* The connected devices the Decrypt view tries (Qt: RestoreAccount::DeviceTry), Data.jsx
   DEVICES with `tries`: 'trying' | 'failed' for a ready one; a locked one is not tried. On a
   backup that opens with a scan key only, a ready device is asked nothing: no device gives
   a scan key. */
const RESTORE_DEVICES = [
  { ...DEVICES[0], tries: 'trying' },
  { ...DEVICES[3] },
  { ...DEVICES[1], tries: 'failed' },
];

/* One device of the Decrypt view: its name, `#fingerprint` or its state detail, and how its
   try goes (Qt: RestoreAccount::refreshDevices, a static SelectRow). */
function RestoreDeviceRow({ device, scanKeyOnly }) {
  const ready = device.state === 'ready';
  const note = !ready ? null : scanKeyOnly ? 'Gives no silent payment scan key'
    : device.tries === 'failed' ? 'Failed to decrypt the file with this device'
    : 'Trying to decrypt with this device…';
  return (
    <SelectRow icon="usb" title={deviceName(device)} chevron={false} note={note}
      sub={ready ? `#${device.fp}` : device.detail || 'Please unlock or open the app on the device'} />
  );
}

const XPUB_LIKE = /^[tx]pub[1-9A-HJ-NP-Za-km-z]{100,}$/;

/* The keys of Keys a backup naming a scan path offers (Qt: RestoreAccount::listKeys): those
   of the path's networks (coin 0 mainnet, else every test network) that can give their scan
   key, by a QR or hot route. */
function restoreKeys(paths) {
  const scan = paths.map(p => SCAN_PATH_RE.exec(p)).find(Boolean);
  if (!scan) return [];
  return KEYS.filter(k => (scan[1] === '0' ? k.network === 'Bitcoin' : k.network !== 'Bitcoin')
    && (k.routes.includes('qr') || k.routes.includes('hot')));
}

/* One key of the Keys section: clickable to ask it for its scan key, not while asking
   (Qt: RestoreAccount::refreshKeyRows). `status`: 'offered' | 'asking' | 'failed', `error`
   the key's own when it gave none. */
function RestoreKeyRow({ k, status = 'offered', error, onAsk }) {
  const note = status === 'asking' ? 'Trying to decrypt with this device…'
    : status === 'failed' ? error || 'Its scan key cannot decrypt this file' : 'Ask for its scan key';
  return (
    <SelectRow icon="key" title={k.alias || k.fp} sub={`#${k.fp}`} chevron={false} note={note}
      onClick={status === 'asking' ? undefined : onAsk} />
  );
}

/* A Review list: a Section of bullet lines (Qt: RestoreAccount::reviewList). */
function BackupList({ label, lines }) {
  return (
    <Section label={label}>
      <Stack gap="xs">
        {lines.map(line => <Text key={line} as="div" variant="body">• {line}</Text>)}
      </Stack>
    </Section>
  );
}

/* Restore Account (Qt: account::view::RestoreAccount), opened from the Account Type picker's
   Restore rows. Views, in order:
   - file (ModalWidth::M): choose the backup file (a BIP139 wallet backup or
     a descriptor, encrypted with BIP138 or not; the system open dialog is not drawn);
   - busy: reading, then restoring;
   - decrypt (ModalWidth::L, its body scrolls: Qt catalog::ScrollArea, fit content): an
     encrypted backup lists each connected device, tried in turn with its xpubs at the
     backup's paths (trying, locked, failed, or giving no scan key), or the empty state;
     a backup naming a BIP352 scan path then lists the keys of Keys to ask for their scan
     key, each on a click (offered, asking, failed); Other options folds the
     air-gap help, the paths, an xpub to paste or import, and the mnemonic behind its risk
     acknowledgement; Back only;
   - review (ModalWidth::M): what decrypted it, the account type and network, its Name (and
     its Network when the backup leaves it unsaid), what the backup holds, what restoring
     needs, its warnings; Back to the file;
   - restored.
   `kind`: 'sp' | 'musig' | 'descriptor' picks the fixture. `initial`: { view, file, error,
   busy, devices, keys ({ fp: { status, error } }), options, xpub, xpubNote, ack, mnemonic,
   mnemonicNote, opener, name, restoreError } for the gallery. */
function RestoreAccountModal({ kind = 'sp', initial = {}, onClose }) {
  const info = BACKUP_INFO[kind];
  const [view, setView] = React.useState(initial.view || 'file');
  const [file, setFile] = React.useState(initial.file || null);
  const [busy, setBusy] = React.useState(initial.busy || null);   // null | 'reading' | 'restoring'
  const [options, setOptions] = React.useState(!!initial.options);
  const [xpub, setXpub] = React.useState(initial.xpub || '');
  const [xpubNote, setXpubNote] = React.useState(initial.xpubNote || null);
  const [ack, setAck] = React.useState(!!initial.ack);
  const [mnemonic, setMnemonic] = React.useState(initial.mnemonic || '');
  const [mnemonicNote, setMnemonicNote] = React.useState(initial.mnemonicNote || null);
  const [opener, setOpener] = React.useState(initial.opener || null);
  const [name, setName] = React.useState(initial.name != null ? initial.name : info.account);
  const [network, setNetwork] = React.useState(RESTORE_NETWORKS[0]);
  const [live, setLive] = React.useState(false);   // the Decrypt view was reached by the flow
  const [keyTries, setKeyTries] = React.useState(initial.keys || {});
  const devices = initial.devices || RESTORE_DEVICES;
  const keys = restoreKeys(info.paths);
  // only scan paths: no device and no xpub opens it (Qt: scanKeyOnly)
  const scanKeyOnly = info.paths.length > 0 && info.paths.every(p => SCAN_PATH_RE.test(p));
  const error = initial.error || null;
  const restoreError = initial.restoreError || null;
  const run = (what, next) => {
    setBusy(what);
    setTimeout(() => { setBusy(null); setView(next); }, 900);
  };
  const clearKeys = () => {
    setXpub(''); setXpubNote(null); setAck(false); setMnemonic(''); setMnemonicNote(null); setOpener(null);
    setKeyTries({});
  };
  const opened = (by) => { setOpener(by); setName(info.account); setView('review'); };
  // In the flow, the device being tried opens the backup after a moment.
  React.useEffect(() => {
    if (view !== 'decrypt' || !live || scanKeyOnly) return undefined;
    const device = devices.find(d => d.state === 'ready' && d.tries === 'trying');
    if (!device) return undefined;
    const t = setTimeout(() => opened(`Decrypted with ${deviceName(device)} #${device.fp}`), 2400);
    return () => clearTimeout(t);
  }, [view, live]);
  const tryXpub = (value) => {
    setXpub(value);
    const v = value.trim();
    if (!v) { setXpubNote(null); return; }
    if (!XPUB_LIKE.test(v)) { setXpubNote('Invalid xpub'); return; }
    if (scanKeyOnly) { setXpubNote('This backup opens with a silent payment scan key, which no xpub gives: ask one of your keys for it, or enter its mnemonic'); return; }
    opened('Decrypted with the xpub given');
  };
  // Asking a key runs its own flow (its QR exchange, its password; not drawn), then its scan
  // key opens the backup.
  const askKey = (k) => {
    setKeyTries(t => ({ ...t, [k.fp]: { status: 'asking' } }));
    setTimeout(() => opened(`Decrypted with ${k.alias || k.fp} #${k.fp}`), 1500);
  };
  const tryMnemonic = (value) => {
    setMnemonic(value);
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { setMnemonicNote(null); return; }
    if (words.length < 12) { setMnemonicNote(null); return; }
    if ((words.length !== 12 && words.length !== 24) || !words.every(isBip39)) { setMnemonicNote('Invalid mnemonic'); return; }
    opened('Decrypted with the mnemonic given');
  };

  if (busy) {
    return (
      <Modal title="Restore Account" width={560} onClose={onClose}>
        <ModalStatus spinner pad="var(--space-l) 0" title={busy === 'reading' ? 'Reading the backup' : 'Restoring the account'}
          subtitle="This takes a few seconds." />
      </Modal>
    );
  }
  if (view === 'decrypt') {
    const order = { trying: 0, locked: 1, failed: 2 };
    const group = (d) => d.state !== 'ready' ? 'locked' : scanKeyOnly ? 'failed' : d.tries;
    const sorted = [...devices].sort((a, b) => order[group(a)] - order[group(b)]);
    return (
      <Modal title="Restore Account" width={600} onClose={onClose}>
        <Stack gap="m">
          <Text as="div" variant="body" color="secondary">Plug in and unlock a signing device belonging to this account to decrypt the backup.</Text>
          <Stack gap="s">
            {sorted.length ? sorted.map(d => <RestoreDeviceRow key={d.id} device={d} scanKeyOnly={scanKeyOnly} />)
              : <EmptyState icon="usb" title="No Device Connected" subtitle="Plug in your signing device and unlock it." />}
          </Stack>
          {keys.length ? <React.Fragment>
            <Text as="div" variant="body" color="secondary">This backup opens with a silent payment scan key, which no connected device gives. Ask one of your keys for it:</Text>
            <Stack gap="s">
              {keys.map(k => <RestoreKeyRow key={k.fp} k={k} {...(keyTries[k.fp] || {})} onAsk={() => askKey(k)} />)}
            </Stack>
          </React.Fragment> : null}
          <FoldSection id="options" label="Other options" open={options} onToggle={() => setOptions(o => !o)}>
            <Stack gap="s">
              <Text as="div" variant="body" color="secondary">{scanKeyOnly ? "This backup opens only with the account's silent payment scan key, which no xpub gives: ask its key in Keys for it above, or enter the key's mnemonic below. Its scan path:" : "Using an air-gapped device? Export the xpub from your device, then paste it or import its file. If you do not know its derivation path, try the following:"}</Text>
              <Stack gap={2}>
                {info.paths.map(p => <Text key={p} as="div" variant="mono">{p}</Text>)}
              </Stack>
              <FieldGroup>
                <Field label="Xpub:">
                  <ValidatedInput mono state={xpubNote ? 'invalid' : 'none'} value={xpub}
                    onChange={e => tryXpub(e.target.value)} wrapStyle={{ flex: 1, minWidth: 0 }} />
                  <Btn id="paste_from_clipboard" onClick={() => tryXpub(DEMO_XPUB_T)} />
                </Field>
                {xpubNote ? <FieldNote tone="error">{xpubNote}</FieldNote> : null}
                {/* the system open dialog is not drawn: Choose File reads the fixture's xpub */}
                <Field label="Xpub file:"><Btn id="choose_file" onClick={() => tryXpub(DEMO_XPUB_T)} /></Field>
              </FieldGroup>
              <Notice tone="warning">UNSAFE: this option is not secure. Entering a mnemonic on a computer may result in theft of the funds.</Notice>
              <Checkbox checked={ack} label="I understand the risk"
                onChange={on => { setAck(on); if (!on) { setMnemonic(''); setMnemonicNote(null); } }} />
              <FieldGroup>
                <Field label="Mnemonic:">
                  <ValidatedInput state={mnemonicNote ? 'invalid' : 'none'} value={mnemonic} disabled={!ack}
                    onChange={e => tryMnemonic(e.target.value)} wrapStyle={{ flex: 1, minWidth: 0 }} />
                </Field>
                {mnemonicNote ? <FieldNote tone="error">{mnemonicNote}</FieldNote> : null}
              </FieldGroup>
            </Stack>
          </FoldSection>
          <ModalActions onBack={() => { clearKeys(); setLive(false); setView('file'); }} />
        </Stack>
      </Modal>
    );
  }
  if (view === 'review') {
    const named = !!name.trim();
    return (
      <Modal title="Restore Account" width={560} onClose={onClose}>
        <Stack gap="m">
          {opener ? <Notice tone="success">{opener}</Notice> : null}
          <Text as="div" variant="body">{info.network ? `${info.kind} · ${info.network}` : info.kind}</Text>
          <FieldGroup>
            <Field label="Name:"><Input width="var(--w-l)" value={name} onChange={e => setName(e.target.value)} /></Field>
            {info.network ? null : <Field label="Network:"><ComboBox value={network} options={RESTORE_NETWORKS} onChange={setNetwork} width="var(--w-l)" /></Field>}
          </FieldGroup>
          <BackupList label="In the Backup" lines={info.includes} />
          <BackupList label="Restoring Needs" lines={info.requirements} />
          {info.warnings.map(w => <Notice key={w} tone="warning">{w}</Notice>)}
          {restoreError ? <Notice tone="error">The account is not restored: {restoreError}</Notice> : null}
          <ModalActions onBack={() => { clearKeys(); setLive(false); setView('file'); }} reason={named ? null : 'Name the account.'}>
            <Btn id="restore_account" disabled={!named} onClick={() => run('restoring', 'restored')} />
          </ModalActions>
        </Stack>
      </Modal>
    );
  }
  if (view === 'restored') {
    return (
      <Modal title="Restore Account" width={560} onClose={onClose}>
        <Stack gap="m">
          <Notice tone="success">{name || info.account} is restored. Open it from the account list.</Notice>
          <ModalActions><Btn id="done" onClick={onClose} /></ModalActions>
        </Stack>
      </Modal>
    );
  }
  const reason = !file ? 'Choose the backup file.' : null;
  const read = () => {
    // an encrypted backup asks for a key, a plain one goes to the review
    if (info.paths.length) { setLive(true); run('reading', 'decrypt'); } else run('reading', 'review');
  };
  return (
    <Modal title="Restore Account" width={560} onClose={onClose}>
      <Stack gap="m">
        <Text as="div" variant="body" color="secondary">Choose the account's backup file: a BIP139 wallet backup or a descriptor, encrypted with BIP138 or not.</Text>
        <FieldGroup>
          {/* the system open dialog (Backups (*.bip138 *.json *.txt), All files (*)) is not
              drawn: Choose File picks the fixture's file */}
          <Field label="Backup:">
            <Row gap="s">
              <Stack style={{ flex: 1, minWidth: 0 }}><Text variant="body" color="secondary">{file || 'No file chosen'}</Text></Stack>
              <Btn id="choose_file" onClick={() => setFile(kind === 'descriptor' ? 'multikey-descriptor.txt' : backupFile(info.account))} />
            </Row>
          </Field>
        </FieldGroup>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <ModalActions reason={reason}>
          <Btn id="read_backup" disabled={!!reason} onClick={read} />
        </ModalActions>
      </Stack>
    </Modal>
  );
}

/* The reconnect gave up: the account's Electrum connection dropped more than 3 times
   in the last minute (Qt: MessageModal, Tone::Error, from the sp and the Multikey
   controllers alike). No action bar: the header × closes it. */
function ElectrumGaveUpModal({ server = 'minta.wizardsardine.com:60001', drops = 4, onClose }) {
  return (
    <Modal title="Electrum Disconnected" width={460} onClose={onClose}>
      <ModalStatus icon="alert" iconColor="var(--error)" pad="var(--space-l) 0"
        subtitle={`The connection to ${server} dropped ${drops} times in the last minute, so Silent stopped reconnecting. Check the server, then connect again from the status bar or the Settings.`} />
    </Modal>
  );
}

Object.assign(window, { SettingsScreen, MusigSettingsScreen, ServerRow, ElectrumGaveUpModal, BackupSection, BackupAccountModal, BACKUP_EXCLUDED, RestoreAccountModal });
