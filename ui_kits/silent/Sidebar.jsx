/* Silent UI Kit — Sidebar nav + bottom StatusBar (AccountWidget.cpp + StatusBar.cpp). */

const NAV_ITEMS = [
  { id: 'history',  label: 'History',  icon: 'history' },
  { id: 'coins',    label: 'Coins',    icon: 'coins' },
  { id: 'send',     label: 'Send',     icon: 'upload' },
  { id: 'receive',  label: 'Receive',  icon: 'download' },
];

function Sidebar({ active, onSelect, musig = false }) {
  return (
    <Stack gap="s" style={{ width: 'var(--sidebar-w)', flex: 'none', background: 'var(--bg-secondary)',
      padding: 'var(--pad-xs)' }}>
      {NAV_ITEMS.map(it => (
        <Button key={it.id} role="menu" className={active === it.id ? 'is-active' : ''} onClick={() => onSelect(it.id)}>
          <Icon name={it.icon} size={20} />
          {it.label}
        </Button>
      ))}
      {musig ? <Button role="menu" className={active === 'psbt' ? 'is-active' : ''} onClick={() => onSelect('psbt')}>
        <Icon name="history" size={20} />PSBT
      </Button> : null}
      <Spacer />
      <Button role="menu" className={active === 'layout' ? 'is-active' : ''} onClick={() => onSelect('layout')}>
        <Icon name="layout" size={20} />
        Layout
      </Button>
      <Button role="menu" className={active === 'settings' ? 'is-active' : ''} onClick={() => onSelect('settings')}>
        <Icon name="settings" size={20} />
        Settings
      </Button>
    </Stack>
  );
}

/* A Multikey Wallet has no scanner: its bar is the Electrum half only, its switch off
   and "Not configured" while the account has no Electrum server (MusigStatusBar.cpp).
   With a plugin blockchain backend (`wallet.blockchainBackend`), the item shows the
   plugin's first connection instead, its switch disabled (the plugin's own settings toggle
   it): "Connected to %1" or "%1 disconnected" (its error as tooltip), "Blockchain from %1"
   when the plugin reports no connection, "%1 not installed" when no plugin serves it
   (MusigStatusBar::onBackendStateChanged). `wallet.backendState`: what the plugin reports,
   { name, connections: [{ name, connected, error }], error }, none when not installed. */
function MusigStatusBar({ wallet }) {
  const [electrum, setElectrum] = React.useState(false);
  if (wallet.blockchainBackend) {
    const state = wallet.backendState;
    const connection = state && state.connections && state.connections[0];
    const text = !state ? `${wallet.blockchainBackend} not installed`
      : !connection ? `Blockchain from ${state.name}`
      : connection.connected ? `Connected to ${connection.name}` : `${connection.name} disconnected`;
    const tip = !state ? undefined : (state.error || (connection && connection.error) || undefined);
    return (
      <Row style={{ height: 'var(--statusbar-h)', flex: 'none', borderTop: '1px solid var(--border)',
        background: 'var(--bg)', padding: '0 var(--pad-s)' }}>
        <Row grow gap="s" style={{ minWidth: 0 }}>
          <Toggle on={!!(connection && connection.connected)} status disabled />
          <Text variant="status" truncate title={tip}>{text}</Text>
        </Row>
      </Row>
    );
  }
  const text = !wallet.electrum ? 'Not configured'
    : electrum ? `Connected to electrum at ${wallet.electrum}` : 'Electrum disconnected';
  return (
    <Row style={{ height: 'var(--statusbar-h)', flex: 'none', borderTop: '1px solid var(--border)',
      background: 'var(--bg)', padding: '0 var(--pad-s)' }}>
      <Row grow gap="s" style={{ minWidth: 0 }}>
        <Toggle on={electrum} status disabled={!wallet.electrum} onClick={() => setElectrum(e => !e)} />
        <Text variant="status" truncate>{text}</Text>
      </Row>
    </Row>
  );
}

function StatusBar({ wallet }) {
  if (wallet.kind === 'musig') {
    return <MusigStatusBar wallet={wallet} />;
  }
  return <SpStatusBar wallet={wallet} />;
}

function SpStatusBar({ wallet }) {
  const [blindbit, setBlindbit] = React.useState(true);
  const [electrum, setElectrum] = React.useState(false);

  const blindbitText = blindbit
    ? `Connected to blindbit-oracle at ${wallet.blindbit}`
    : 'Disconnected';
  const electrumText = electrum
    ? `Connected to electrum at ${wallet.electrum}`
    : 'Electrum disconnected';

  return (
    <Row style={{ height: 'var(--statusbar-h)', flex: 'none', borderTop: '1px solid var(--border)',
      background: 'var(--bg)', padding: '0 var(--pad-s)' }}>
      <Row grow gap="s" style={{ minWidth: 0 }}>
        <Toggle on={blindbit} status onClick={() => setBlindbit(b => !b)} />
        <Text variant="status" truncate>{blindbitText}</Text>
      </Row>
      <Divider vertical space="0" style={{ margin: '5px 0' }} />
      <Row grow gap="s" style={{ minWidth: 0, paddingLeft: 'var(--space-s)' }}>
        <Toggle on={electrum} status onClick={() => setElectrum(e => !e)} />
        <Text variant="status" truncate>{electrumText}</Text>
      </Row>
    </Row>
  );
}

Object.assign(window, { Sidebar, StatusBar, MusigStatusBar, NAV_ITEMS });
