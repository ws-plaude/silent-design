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

/* The plugins offering themselves as a blockchain backend, by their plugin name (Qt:
   PluginRegistry::blockchainBackends()). */
const BLOCKCHAIN_BACKENDS = [{ id: 'bitcoind', name: 'Bitcoin Core (bitcoind)' }];
const BACKEND_ELECTRUM = 'Electrum (built-in)';
const SETTINGS_PICKER_WIDTH = 160;   /* Qt: metric::SETTINGS_PICKER_WIDTH */

/* A Multikey account's backend is missing when it names a module no plugin installs. */
const backendMissing = (id, installed = BLOCKCHAIN_BACKENDS) => !!id && !installed.some(b => b.id === id);

/* Blockchain backend (musig SettingsExtras::initBackend): where the account reads the
   blockchain. The picker lists Electrum (built-in), then each plugin offering itself, and a
   chosen module that is not installed by its raw id; it is disabled while a choice saves
   (a saved choice rebuilds Settings over the new services). The error line under it: the
   missing backend, or why a choice was refused or not saved. While a plugin supplies the
   blockchain, Rescan from height follows (RescanFromHeight). `backend`: { chosen (a module
   id, '' for Electrum), installed, error, saving, rescan } for the gallery. `birthday`: the
   account's birthday height, 0 or none when it has none. */
function BlockchainBackendSection({ backend = {}, birthday }) {
  const installed = backend.installed || BLOCKCHAIN_BACKENDS;
  const [chosen, setChosen] = React.useState(backend.chosen || '');
  const [saving, setSaving] = React.useState(!!backend.saving);
  const [error, setError] = React.useState(backend.error != null ? backend.error
    : backendMissing(backend.chosen, installed) ? `The blockchain backend ${backend.chosen} is not installed. Install it, or choose another backend.` : null);
  const entries = [{ id: '', name: BACKEND_ELECTRUM }, ...installed.map(b => ({ id: b.id, name: b.name }))];
  if (!entries.some(e => e.id === chosen)) entries.push({ id: chosen, name: chosen });
  const label = (entries.find(e => e.id === chosen) || entries[0]).name;
  const pick = (name) => {
    const entry = entries.find(e => e.name === name);
    if (!entry || entry.id === chosen) return;
    setSaving(true); setError(null);
    setTimeout(() => { setSaving(false); setChosen(entry.id); }, 900);
  };
  return (
    <Section label="Blockchain backend">
      <Stack gap="s">
        <Text as="div" variant="body" color="secondary">Where this account reads the blockchain: the built-in Electrum server, or a plugin watching its descriptors.</Text>
        <Row><ComboBox value={label} options={entries.map(e => e.name)} onChange={pick} minWidth={SETTINGS_PICKER_WIDTH} disabled={saving} /></Row>
        {error ? <Text as="div" variant="body" color="error">{error}</Text> : null}
        {chosen && !backendMissing(chosen, installed) ? <RescanFromHeight birthday={birthday} initial={backend.rescan} /> : null}
      </Stack>
    </Section>
  );
}

/* Rescan from height (musig SettingsExtras::initRescan): the height starts at the account's
   `birthday` height, Rescan enabled (a Multikey account restored from a backup carrying a
   BIP139 block_height keeps it as its birthday), and empty under its "Block height"
   placeholder when it has none (a newly created account records only a time). Digits only,
   a check once a height is entered; Rescan is disabled until then and while a request is
   pending. The status line, hidden until the plugin answers: the scan started (secondary),
   or the plugin's message (error). `initial`: { height, pending, done, refused } for the
   gallery. */
function RescanFromHeight({ birthday, initial = {} }) {
  const [height, setHeight] = React.useState(initial.height || (birthday ? String(birthday) : ''));
  const [pending, setPending] = React.useState(!!initial.pending);
  const [answer, setAnswer] = React.useState(initial.refused ? { tone: 'error', text: initial.refused }
    : initial.done ? { tone: 'secondary', text: `The blockchain backend scans again from block ${initial.height}.` } : null);
  const rescan = () => {
    const from = height;
    setPending(true); setAnswer(null);
    setTimeout(() => { setPending(false); setAnswer({ tone: 'secondary', text: `The blockchain backend scans again from block ${from}.` }); }, 900);
  };
  return (
    <Stack gap="s">
      <Text as="div" variant="secondary" color="text">Rescan from height</Text>
      <Row gap="s">
        <ValidatedInput mono state={height ? 'valid' : 'none'} value={height} placeholder="Block height" inputMode="numeric"
          onChange={e => setHeight(e.target.value.replace(/\D/g, ''))} wrapStyle={{ width: 'var(--w-s)', flex: 'none' }} />
        <Btn id="rescan" disabled={!height || pending} onClick={rescan} />
        <Spacer />
      </Row>
      {answer ? <Text as="div" variant="body" color={answer.tone}>{answer.text}</Text> : null}
    </Stack>
  );
}

/* A Multikey Wallet's Settings (core Settings.cpp + musig SettingsExtras.cpp): the
   Electrum ServerRow, Blockchain backend (BlockchainBackendSection), Policy (its spend
   paths; Register Descriptor on the cosigners' devices under it), Descriptor (pretty, keys
   as aliases; copy for backup), then Backup (BackupSection). `backend`: the
   BlockchainBackendSection fixture, else the wallet's `blockchainBackend`; the wallet's
   `birthdayHeight` starts the rescan field. */
function MusigSettingsScreen({ wallet, backend }) {
  const [registering, setRegistering] = React.useState(false);
  const [backingUp, setBackingUp] = React.useState(false);
  React.useEffect(() => { setRegistering(false); setBackingUp(false); }, [wallet]);
  return (
    <ScreenWrap title="Settings" titleRight={<Pill id="network" label={wallet.network} />}>
      <Stack gap="l">
        <ServerRow label="Electrum Address" initial={wallet.electrum} placeholder="host:port (e.g. 127.0.0.1:50001)"
          height={wallet.electrumHeight} connectId="connect_electrum" disconnectId="disconnect_electrum" transport lockConnectedElectrum />
        <BlockchainBackendSection key={wallet.name} birthday={wallet.birthdayHeight}
          backend={backend || { chosen: wallet.blockchainBackend || '' }} />
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
        <BackupSection kind="multikey" onBackup={() => setBackingUp(true)} />
      </Stack>
      {registering && window.RegisterDescriptorModal ? <RegisterDescriptorModal onClose={() => setRegistering(false)} /> : null}
      {backingUp ? <BackupAccountModal kind="multikey" account={wallet.name} onClose={() => setBackingUp(false)} /> : null}
    </ScreenWrap>
  );
}

function SettingsScreen({ wallet, backend }) {
  if (wallet.kind === 'musig') {
    return <MusigSettingsScreen wallet={wallet} backend={backend} />;
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
          <BackupSection kind="sp" onBackup={() => setBackingUp(true)} />
        </Stack>
      {backingUp ? <BackupAccountModal kind="sp" account={wallet.name} onClose={() => setBackingUp(false)} /> : null}
    </ScreenWrap>
  );
}

/* What a backup holds and what opens it, each account kind its own (Qt:
   IAccountBackend::backupDescription(): `summary` under the Settings' Backup, `details` in
   Backup Account). `kind`: 'sp' | 'multikey'. */
const BACKUP_TEXTS = {
  sp: {
    summary: "Saves this account to a file encrypted with BIP138: its descriptors, servers, address indexes and labels. It holds the account's scan key and opens only with it, from its key in Keys or its mnemonic. The spending keys are never in it: they stay in Keys.",
    details: "The backup is a BIP139 wallet backup encrypted with BIP138. It holds the account's descriptors, servers, address indexes and labels, and the account's scan key, to which it is encrypted: only that key opens it, from its key in Keys or its mnemonic, and whoever opens it sees the account's payments. The spending keys are never in a backup.",
  },
  multikey: {
    summary: "Saves this account to a file encrypted with BIP138: its descriptors, servers, address indexes and labels. It opens with any one of the policy's keys and holds no signing secret. The spending keys are never in it: they stay in Keys.",
    details: "The backup is a BIP139 wallet backup encrypted with BIP138. It holds the account's descriptors, servers, address indexes and labels. It is encrypted to the policy's keys: any one of them opens it, from its signing device, its xpub or its mnemonic, and it holds no signing secret. The spending keys are never in a backup.",
  },
};

/* Every account's Settings ends with Backup (core Settings.cpp, sp and Multikey alike): what
   the account kind's backup holds, Backup Account right-aligned under it (the Register
   Descriptor row recipe). `kind`: 'sp' | 'multikey'. */
function BackupSection({ kind = 'sp', onBackup }) {
  return (
    <Section label="Backup">
      <Stack gap="s">
        <Text as="div" variant="body" color="secondary">{BACKUP_TEXTS[kind].summary}</Text>
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
   `kind`: 'sp' | 'multikey' picks the save view's text. `initial`: { view, error, excluded }
   for the gallery. */
function BackupAccountModal({ kind = 'sp', account = 'savings', initial = {}, onClose }) {
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
        <Text as="div" variant="body" color="secondary">{BACKUP_TEXTS[kind].details}</Text>
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
     air-gap help, the paths, an xpub to paste or import (left out when only a scan key
     opens it), and the mnemonic behind its risk
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
          {/* no device gives a scan key: a backup only one opens lists no device (Qt: scanKeyOnly) */}
          {scanKeyOnly ? null : <React.Fragment>
            <Text as="div" variant="body" color="secondary">Plug in and unlock a signing device belonging to this account to decrypt the backup.</Text>
            <Stack gap="s">
              {sorted.length ? sorted.map(d => <RestoreDeviceRow key={d.id} device={d} scanKeyOnly={scanKeyOnly} />)
                : <EmptyState icon="usb" title="No Device Connected" subtitle="Plug in your signing device and unlock it." />}
            </Stack>
          </React.Fragment>}
          {scanKeyOnly || keys.length ? <React.Fragment>
            <Text as="div" variant="body" color="secondary">This backup opens only with the account's silent payment scan key, which no signing device gives: ask its key in Keys for it, or enter the key's mnemonic under Other options.</Text>
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
              {/* no xpub opens a backup keyed by a scan key: its xpub rows are left out */}
              {scanKeyOnly ? null : <FieldGroup>
                <Field label="Xpub:">
                  <ValidatedInput mono state={xpubNote ? 'invalid' : 'none'} value={xpub}
                    onChange={e => tryXpub(e.target.value)} wrapStyle={{ flex: 1, minWidth: 0 }} />
                  <Btn id="paste_from_clipboard" onClick={() => tryXpub(DEMO_XPUB_T)} />
                </Field>
                {xpubNote ? <FieldNote tone="error">{xpubNote}</FieldNote> : null}
                {/* the system open dialog is not drawn: Choose File reads the fixture's xpub */}
                <Field label="Xpub file:"><Btn id="choose_file" onClick={() => tryXpub(DEMO_XPUB_T)} /></Field>
              </FieldGroup>}
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

Object.assign(window, { SettingsScreen, MusigSettingsScreen, BlockchainBackendSection, RescanFromHeight, BLOCKCHAIN_BACKENDS, backendMissing, ServerRow, ElectrumGaveUpModal, BackupSection, BackupAccountModal, BACKUP_TEXTS, BACKUP_EXCLUDED, RestoreAccountModal });
