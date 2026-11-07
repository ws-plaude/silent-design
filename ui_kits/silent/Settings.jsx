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
        <Text as="div" variant="body" color="secondary">Saves this account to a file sealed with a password: its descriptors, servers, address indexes and labels. The signing keys are not in it: they stay in Keys.</Text>
        <Row justify="flex-end"><Btn id="backup_account" onClick={onBackup} /></Row>
      </Stack>
    </Section>
  );
}

const BACKUP_MIN_PASSWORD = 8;
const backupFile = (account) => `${account}-20261107.silent-backup`;

/* Backup Account (Qt: account::view::BackupAccount, ModalWidth::M), the state password
   setup's recipe. Views: password (choose and confirm the password that seals it), busy
   (sealing; then the system save dialog, not drawn), saved. `initial`: { view, pw, confirm,
   error } for the gallery. */
function BackupAccountModal({ account = 'savings', initial = {}, onClose }) {
  const [view, setView] = React.useState(initial.view || 'password');
  const [pw, setPw] = React.useState(initial.pw || '');
  const [confirm, setConfirm] = React.useState(initial.confirm || '');
  const error = initial.error || null;
  const seal = () => {
    setPw(''); setConfirm(''); setView('busy');
    setTimeout(() => setView('saved'), 900);
  };

  if (view === 'busy') {
    return (
      <Modal title="Backup Account" width={560} onClose={onClose}>
        <ModalStatus spinner pad="var(--space-l) 0" title="Sealing the backup" subtitle="This takes a few seconds." />
      </Modal>
    );
  }
  if (view === 'saved') {
    return (
      <Modal title="Backup Account" width={560} onClose={onClose}>
        <Stack gap="m">
          <Notice tone="success">The backup is saved to /home/alice/{backupFile(account)}</Notice>
          <ModalActions><Btn id="done" onClick={onClose} /></ModalActions>
        </Stack>
      </Modal>
    );
  }
  const short = pw && pw.length < BACKUP_MIN_PASSWORD;
  const mismatch = confirm && confirm !== pw;
  const reason = !pw ? 'Choose a password.' : pw.length < BACKUP_MIN_PASSWORD ? 'Use at least 8 characters.'
    : confirm !== pw ? 'The two passwords must match.' : null;
  return (
    <Modal title="Backup Account" width={560} onClose={onClose}>
      <Stack gap="m">
        <Text as="div" variant="body" color="secondary">Choose the password that seals the backup. It is needed to restore the account: it is not saved anywhere.</Text>
        <FieldGroup>
          <Field label="Password:"><Input type="password" width={260} value={pw} onChange={e => setPw(e.target.value)} /></Field>
          {short ? <FieldNote tone="error">Use at least 8 characters.</FieldNote> : null}
          <Field label="Confirm:"><Input type="password" width={260} value={confirm} onChange={e => setConfirm(e.target.value)} /></Field>
          {mismatch ? <FieldNote tone="error">The passwords do not match.</FieldNote> : null}
        </FieldGroup>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <ModalActions reason={reason}>
          <Btn id="save_backup" disabled={!!reason} onClick={seal} />
        </ModalActions>
      </Stack>
    </Modal>
  );
}

/* What a read backup says (Qt: backend::BackupInfo, from the account backup's contents):
   one fixture per account kind, the servers and keys of the Data.jsx accounts. */
const BACKUP_INFO = {
  sp: {
    account: 'savings', kind: 'Silent Payment Wallet', network: 'Signet',
    includes: [
      "The silent payment descriptor, with its scan key: whoever opens the backup sees the account's payments",
      'Server: https://blindbit.silentpayments.dev',
      'Server: signet.electrum.silent:50001',
      'Segwit addresses handed out: 2 receive, 0 change',
      'Scanning starts at block 809500',
      'Labels: 4',
    ],
    requirements: [
      'The signing keys 73c5da0a, in Keys: the backup holds no secret',
      'Its coins and history are found again by scanning from block 809500',
    ],
    warnings: [],
  },
  musig: {
    account: 'multikey', kind: 'Multikey Wallet', network: 'Regtest',
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
};

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

/* Restore Account (Qt: account::view::RestoreAccount, ModalWidth::M), opened from the
   Account Type picker's Restore rows. Views: password (choose the backup file, then its
   password), busy (reading, then restoring), review (what the backup holds, what restoring
   needs, its warnings; Back to the password), restored. `kind`: 'sp' | 'musig' picks the
   fixture. `initial`: { view, file, pw, error, restoreError } for the gallery. */
function RestoreAccountModal({ kind = 'sp', initial = {}, onClose }) {
  const info = BACKUP_INFO[kind];
  const [view, setView] = React.useState(initial.view || 'password');
  const [file, setFile] = React.useState(initial.file || null);
  const [pw, setPw] = React.useState(initial.pw || '');
  const [busy, setBusy] = React.useState(initial.busy || null);   // null | 'reading' | 'restoring'
  const error = initial.error || null;
  const restoreError = initial.restoreError || null;
  const run = (what, next) => {
    setBusy(what);
    setTimeout(() => { setBusy(null); setView(next); }, 900);
  };

  if (busy) {
    return (
      <Modal title="Restore Account" width={560} onClose={onClose}>
        <ModalStatus spinner pad="var(--space-l) 0" title={busy === 'reading' ? 'Reading the backup' : 'Restoring the account'}
          subtitle="This takes a few seconds." />
      </Modal>
    );
  }
  if (view === 'review') {
    return (
      <Modal title="Restore Account" width={560} onClose={onClose}>
        <Stack gap="m">
          <Text as="div" variant="body">{info.account} · {info.kind} · {info.network}</Text>
          <BackupList label="In the Backup" lines={info.includes} />
          <BackupList label="Restoring Needs" lines={info.requirements} />
          {info.warnings.map(w => <Notice key={w} tone="warning">{w}</Notice>)}
          {restoreError ? <Notice tone="error">The account is not restored: {restoreError}</Notice> : null}
          <ModalActions onBack={() => { setPw(''); setView('password'); }}>
            <Btn id="restore_account" onClick={() => run('restoring', 'restored')} />
          </ModalActions>
        </Stack>
      </Modal>
    );
  }
  if (view === 'restored') {
    return (
      <Modal title="Restore Account" width={560} onClose={onClose}>
        <Stack gap="m">
          <Notice tone="success">{info.account} is restored. Open it from the account list.</Notice>
          <ModalActions><Btn id="done" onClick={onClose} /></ModalActions>
        </Stack>
      </Modal>
    );
  }
  const reason = !file ? 'Choose the backup file.' : !pw ? "Enter the backup's password." : null;
  return (
    <Modal title="Restore Account" width={560} onClose={onClose}>
      <Stack gap="m">
        <Text as="div" variant="body" color="secondary">Choose the account's backup file and enter the password it was sealed with.</Text>
        <FieldGroup>
          {/* the system open dialog is not drawn: Choose File picks the fixture's file */}
          <Field label="Backup:">
            <Row gap="s">
              <Stack style={{ flex: 1, minWidth: 0 }}><Text variant="body" color="secondary">{file || 'No file chosen'}</Text></Stack>
              <Btn id="choose_file" onClick={() => setFile(backupFile(info.account))} />
            </Row>
          </Field>
          <Field label="Password:"><Input type="password" width={260} value={pw} onChange={e => setPw(e.target.value)} /></Field>
        </FieldGroup>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <ModalActions reason={reason}>
          <Btn id="read_backup" disabled={!!reason} onClick={() => { setPw(''); run('reading', 'review'); }} />
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

Object.assign(window, { SettingsScreen, MusigSettingsScreen, ServerRow, ElectrumGaveUpModal, BackupSection, BackupAccountModal, RestoreAccountModal });
