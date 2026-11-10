/* Silent UI Kit — App shell: QTabWidget tabs (MainWindow.cpp) + AccountView.
   Tab order: wallets · + menu, then the module tabs right aligned: Keys, settings gear (the
   global settings page, GlobalSettings.jsx, issue #46), which owns the theme.
   Structure is built from catalog layout primitives (Stack/Row/Text) so it maps
   1:1 to Qt layouts; Tab is the catalog component (Primitives.jsx). */

const SCREENS = {
  history: HistoryScreen, coins: CoinsScreen, send: SendScreen,
  receive: ReceiveScreen, settings: SettingsScreen, layout: LayoutDoc,
};

/* A Multikey account whose blockchain backend is not installed opens on Settings, which
   names it; History, Coins, Send, Receive and PSBT are not built, their menu entries stay
   (Qt: MusigAccountController::loadPanels). */
function AccountView({ wallet, screen, onScreen, appWidth }) {
  const [records, setRecords] = React.useState(SAVED_PSBTS);
  const [resume, setResume] = React.useState(null);
  const [restoreCount, setRestoreCount] = React.useState(0);
  const missing = wallet.kind === 'musig' && backendMissing(wallet.blockchainBackend);
  React.useEffect(() => { if (missing && screen !== 'settings') onScreen('settings'); }, [missing]);
  const select = (s) => { if (!missing || s === 'settings') onScreen(s); };
  // Send is kept mounted (hidden when inactive) so its draft state survives navigation.
  const isSend = screen === 'send';
  const OtherComp = missing ? (screen === 'settings' ? SettingsScreen : null)
    : !isSend && screen !== 'psbt' ? (SCREENS[screen] || HistoryScreen) : null;
  return (
    <Stack grow style={{ minHeight: 0 }}>
      <Row grow align="stretch" style={{ minHeight: 0 }}>
        <Sidebar active={screen} onSelect={select} musig={wallet.kind === 'musig'} />
        <Stack grow style={{ background: 'var(--bg)' }}>
          {missing ? null : <Stack grow style={{ display: isSend ? 'flex' : 'none', minHeight: 0 }}>
            <SendScreen key={wallet.name + restoreCount} wallet={wallet} initial={resume || {}}
              onProgress={patch => setRecords(rows => rows.map(r => resume && r.id === resume.id ? { ...r, ...patch, edited: new Date().toISOString().slice(0, 16).replace('T', ' ') } : r))} />
          </Stack>}
          {screen === 'psbt' && wallet.kind === 'musig' && !missing ? <SavedPsbts records={records} onChange={setRecords} compact={appWidth < 1040} tip={parseInt(wallet.electrumHeight, 10) || 0}
            onOpen={record => { setResume(record); setRestoreCount(n => n + 1); onScreen('send'); }} /> : null}
          {OtherComp ? <OtherComp wallet={wallet} compact={appWidth < 1040} /> : null}
        </Stack>
      </Row>
      <StatusBar wallet={wallet} />
    </Stack>
  );
}

function App() {
  // Theme is a global setting (GlobalSettingsTab). Module themes render on the
  // light palette in the kit; the app ships their own palettes.
  const [themeName, setThemeName] = React.useState('Light');
  const theme = themeName === 'Dark' || themeName === 'Midnight' ? 'dark' : 'light';
  const [appW, setAppW] = React.useState('1920');
  const [known, setKnown] = React.useState(KNOWN_WALLETS);
  const [openTabs, setOpenTabs] = React.useState(['savings', 'multikey']);
  const [active, setActive] = React.useState('multikey');
  const [screens, setScreens] = React.useState({ savings: 'history', multikey: 'history' });
  /* Kit width: a fixed width wider than the preview renders at its real width,
     scaled down to fit, so wide layouts (two-column Send ≥ 1769) can be checked. */
  const [paneW, setPaneW] = React.useState(window.innerWidth);
  const toolbarRef = React.useRef(null);
  const [toolbarH, setToolbarH] = React.useState(49);
  React.useEffect(() => {
    const on = () => { setPaneW(window.innerWidth); if (toolbarRef.current) setToolbarH(toolbarRef.current.offsetHeight); };
    on(); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on);
  }, []);
  const fixedW = appW === 'full' ? null : Number(appW);
  const scale = fixedW && fixedW > paneW ? paneW / fixedW : 1;
  // Kit-only state simulator (KitSim.jsx): states the UI cannot reach by clicking.
  const [sim, setSim] = useTweaks(SIM_DEFAULTS);
  const keysSimKey = ['keysDevices', 'keysKeys', 'keysRegistering'].map(k => String(sim[k])).join('|');

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const ensureWallet = (name) => {
    // Build a wallet record; fall back to a blank-ish one for created/unknown wallets
    return WALLETS[name] || {
      name, network: 'Regtest', blindbit: 'http://localhost:8080',
      electrum: '127.0.0.1:50001',
      confirmed: '0.00000000 BTC', confirmedCount: '0 coins',
      unconfirmed: '0.00000000 BTC', unconfirmedCount: '0 coins',
      coins: [], history: [],
    };
  };

  const openWallet = (name) => {
    if (!openTabs.includes(name)) setOpenTabs([...openTabs, name]);
    if (!screens[name]) setScreens(s => ({ ...s, [name]: 'history' }));
    setActive(name);
  };
  const closeWallet = (name) => {
    const remaining = openTabs.filter(t => t !== name);
    setOpenTabs(remaining);
    if (active === name) setActive(remaining.length ? remaining[remaining.length - 1] : 'menu');
  };
  const createWallet = (name) => { setKnown(k => k.includes(name) ? k : [...k, name]); openWallet(name); };
  const deleteWallet = (name) => { setKnown(k => k.filter(n => n !== name)); closeWallet(name); };

  return (
    <Stack style={{
      height: '100vh',
      background: appW === 'full' ? 'var(--bg)' : (theme === 'light' ? '#c9c9c9' : '#070707'),
    }}>
      {/* Kit toolbar (not part of the product — dev chrome, not translated to Qt) */}
      <div ref={toolbarRef} style={{ flex: 'none' }}>
      <Row gap={10} style={{ flex: 'none', padding: '10px 16px',
        borderBottom: '1px solid var(--border)', background: theme === 'light' ? '#e8e8e8' : '#161616' }}>
        <SilentMark size={20} style={{ color: 'var(--accent)' }} />
        <Text variant="body" weight="demibold" style={{ color: theme === 'light' ? '#333' : '#bbb' }}>Silent — UI Kit</Text>
        <Spacer />
        <button type="button" onClick={() => window.postMessage({ type: '__kit_toggle_tweaks' }, '*')}
          style={{ font: 'inherit', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>Simulate</button>
        {/* App width selector (kit-only) — slider/ruler with a pointer */}
        <Row gap={10} style={{ marginRight: 8 }}>
          <Text variant="caption" weight="demibold" style={{ color: theme === 'light' ? '#777' : '#888' }}>Width</Text>
          {/* Restricted so the window can't be sized below content-min + sidebar
              (760 + 200 = 960) — the content area never drops under its 760 min. */}
          <input type="range" min={(window.DASH_MIN_W || 760) + 200} max={2560} step={20} value={fixedW || paneW}
            onChange={e => setAppW(String(e.target.value))}
            style={{ width: 200, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <button type="button" onClick={() => setAppW('full')}
            style={{ font: 'inherit', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--border)', background: appW === 'full' ? 'var(--accent)' : 'var(--bg)', color: appW === 'full' ? 'var(--on-accent)' : 'var(--text)' }}>Full</button>
          <Text variant="mono" weight="demibold" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums',
            color: theme === 'light' ? '#555' : '#aaa', minWidth: 96, textAlign: 'right' }}>
            {(fixedW || paneW) + 'px' + (scale < 1 ? ' · ' + Math.round(scale * 100) + '%' : '')}
          </Text>
        </Row>
      </Row>
      </div>

      {/* App window — scaled to fit when the chosen width exceeds the preview */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
      <Stack grow style={scale < 1 ? {
        flex: 'none', width: fixedW + 'px', height: `calc((100vh - ${toolbarH}px) / ${scale})`,
        transform: `scale(${scale})`, transformOrigin: 'top left',
        minHeight: 0, background: 'var(--bg)', overflow: 'hidden',
      } : {
        width: '100%', maxWidth: appW === 'full' ? '100%' : appW + 'px', margin: '0 auto',
        minHeight: 0, background: 'var(--bg)', overflow: 'hidden',
        borderLeft: appW === 'full' ? 'none' : '1px solid var(--border)',
        borderRight: appW === 'full' ? 'none' : '1px solid var(--border)',
      }}>
        {/* Tab bar: wallet tabs · + menu tab, then Keys and the settings gear right aligned */}
        <div className="s-tabstrip" style={{ flex: 'none', padding: 'var(--pad-xs) var(--pad-xs) 0',
          background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <div className="s-tabstrip__tabs">
            {openTabs.map(name => (
              <Tab key={name} label={name} active={active === name} closable
                onClick={() => setActive(name)} onClose={() => closeWallet(name)} />
            ))}
            <Tab label="+" handle active={active === 'menu'} closable={false} onClick={() => setActive('menu')} />
          </div>
          <div className="s-tabstrip__modules">
            <Tab label="Keys" active={active === 'keys'} closable={false} onClick={() => setActive('keys')} />
            <Tab label="Settings" icon="settings" handle active={active === 'settings'} closable={false} onClick={() => setActive('settings')} />
          </div>
        </div>

        {/* Content */}
        <Row grow align="stretch" style={{ minHeight: 0, background: 'var(--bg)', position: 'relative' }}>
          {/* Keys stays mounted so its state survives tab switches */}
          <div style={{ display: active === 'keys' ? 'flex' : 'none', flex: 1, minWidth: 0, minHeight: 0 }}><KeysScreen key={keysSimKey} {...simKeysProps(sim)} /></div>
          {active === 'keys' ? null : active === 'settings' ? (
            /* not kept mounted: leaving the tab goes back to its sections (Qt: hideEvent) */
            <GlobalSettingsTab theme={themeName} onTheme={setThemeName} />
          ) : active === 'menu' ? (
            <MenuTab wallets={known} openWallets={openTabs} onOpenKeys={() => setActive('keys')}
              musigSim={simMusigProps(sim)} musigSimKey={sim.musigCached + '|' + sim.musigRoutes}
              onOpen={openWallet} onCreate={createWallet} onDelete={deleteWallet} />
          ) : (
            <AccountView key={active + '|' + sim.musigBackend} wallet={simWallet(ensureWallet(active), sim)} screen={screens[active] || 'history'} appWidth={fixedW || paneW}
              onScreen={(s) => setScreens(prev => ({ ...prev, [active]: s }))} />
          )}
          <KitSimPanel t={sim} setTweak={setSim} />
        </Row>
      </Stack>
      </div>
    </Stack>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PriceFeedProvider><FeeFeedProvider><App /></FeeFeedProvider></PriceFeedProvider>);
