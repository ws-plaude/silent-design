/* Silent UI Kit — Global Settings tab (issues #4, #46; src/views/modals/AppSettings.cpp).
   A module tab right of Keys (not a modal): a page titled "Settings", as the Keys page,
   a centred column. Sections: General (theme, language), optional Price feed,
   Transaction fees, Plugin Manager (external plugins only), and Extension Settings
   (module sections, only when at least one exists).
   Opening a section, a plugin's access or confirming disable/removal REPLACES the
   page content, with a way back; leaving the tab goes back to the sections. */

const GS_WIDTH = 1040;   /* a flow's width, the content width of the former 1040 modal */
/* One body width whatever the rows hold: longer texts wrap in it.
   Qt: metric::SETTINGS_BODY_WIDTH. */
const GS_BODY_WIDTH = 666;
const GS_REMOVE_WIDTH = 760; /* Qt: ModalWidth::Wizard. */

/* PluginRow — one discovered plugin: name · description, id + version (mono),
   enable toggle. A plugin that failed to load uses the error row tone, with the
   reason, and has no toggle (there is nothing to switch). The toggle slot keeps its
   width when empty, so id/version lines up on every row. Once the plugin has asked
   for the accounts or the keys (an answer is kept), Access opens what it may use.
   Qt: QFrame row with HBox(Label stack, Label, Pill or Access, Toggle). */
function PluginRow({ plugin, busy, unavailable, onToggle, onAccess, onRemove, onRetryDisable }) {
  const failed = !!plugin.error;
  const hasAccess = !!(plugin.access && plugin.access.length);
  return (
    <SelectRow icon={failed ? 'circle_x' : 'puzzle'} tone={failed ? 'error' : undefined} title={plugin.name || plugin.id}
      sub={failed ? plugin.error : plugin.removing ? 'Unavailable during shutdown or removal. After an error, use Remove to retry cleanup.' : plugin.desc}
      meta={`${plugin.id}  v${plugin.version}`}
      status={<Row gap="s">
        {plugin.disableFailed && !busy ? <Btn id="retry_disable_plugin" disabled={unavailable} onClick={() => onRetryDisable && onRetryDisable(plugin)} /> : null}
        {!busy && !plugin.removing && hasAccess ? <Btn id="plugin_access" disabled={unavailable} onClick={() => onAccess && onAccess(plugin)} /> : null}
        <Btn id="remove_plugin" disabled={busy || unavailable} onClick={() => onRemove && onRemove(plugin)} />
      </Row>}
      trailingWidth="var(--toggle-w)" chevron={false}
      trailing={failed ? null : <Toggle on={plugin.enabled} disabled={busy || plugin.removing || unavailable} onClick={() => onToggle(plugin)} />} />
  );
}

function GeneralSection({ theme, themes, onTheme, language, onLanguage, langSaved, open = true, onFold }) {
  const mod = themes.find(t => t.name === theme && t.provider);
  return (
    <Stack>
      <SectionHeader label="General" open={open} onToggle={onFold} />
      {open ? <Row gap="xl" align="flex-start" wrap>
        <Stack gap="xs">
          <Field label="Theme:"><ComboBox value={theme} options={themes.map(t => t.name)} onChange={onTheme} width={160} /></Field>
          {mod ? <Text as="div" variant="caption">Provided by {mod.provider}.</Text> : null}
        </Stack>
        <Stack gap="xs">
          <Field label="Language:"><ComboBox value={language} options={LANGUAGES} onChange={onLanguage} width={160} /></Field>
          {langSaved ? <Text as="div" variant="caption" color="success">Language saved. Restart Silent to apply it everywhere.</Text> : null}
        </Stack>
      </Row> : null}
    </Stack>
  );
}

function PriceFeedSection({ open = true, onFold }) {
  const { sources, price, selectPrice } = React.useContext(PriceFeedContext);
  if (!sources.length) return null;
  const source = sources.find(s => s.id === price.source);
  const sourceLabel = source ? source.name : price.source ? `${price.source} (unavailable)` : 'None';
  const currencies = source ? source.currencies : [];
  const currencyLabel = !price.currency ? 'None' : currencies.includes(price.currency) ? price.currency : `${price.currency} (unavailable)`;
  const sourceOptions = ['None', ...sources.map(s => s.name), ...(!source && price.source ? [sourceLabel] : [])];
  const currencyOptions = ['None', ...currencies, ...(price.currency && !currencies.includes(price.currency) ? [currencyLabel] : [])];
  return <Stack>
    <SectionHeader label="Price feed" open={open} onToggle={onFold} />
    {open ? <FieldGroup>
      <Field label="Source:"><ComboBox width={160} value={sourceLabel} options={sourceOptions}
        onChange={label => selectPrice(label === sourceLabel ? price.source : (sources.find(s => s.name === label) || {}).id || '', '')} /></Field>
      <Field label="Currency:"><ComboBox width={160} value={currencyLabel} options={currencyOptions} disabled={!currencies.length}
        onChange={label => selectPrice(price.source, label === currencyLabel ? price.currency : label === 'None' ? '' : label)} /></Field>
    </FieldGroup> : null}
  </Stack>;
}

function FeeSourceField({ label, sources, value, onChange }) {
  const source = sources.find(s => s.id === value);
  const selected = source ? source.name : value ? `${value} (unavailable)` : 'None';
  const options = ['None', ...sources.map(s => s.name), ...(!source && value ? [selected] : [])];
  return <FieldGroup><Field label={label}>
    <ComboBox value={selected} options={options}
      onChange={name => onChange(name === selected ? value : (sources.find(s => s.name === name) || {}).id || '')} />
  </Field></FieldGroup>;
}

function FeeSettingsSection({ open = true, onFold }) {
  const { sources, preferences, selectFees } = React.useContext(FeeFeedContext);
  const defaults = sources.filter(s => s.has_default), smart = sources.filter(s => s.has_smart);
  const modes = ['Manual', ...(defaults.length || preferences.mode === 'Default' ? ['Default'] : []), ...(smart.length || preferences.mode === 'Smart' ? ['Smart'] : [])];
  const set = patch => selectFees({ ...preferences, ...patch });
  return <Stack>
    <SectionHeader label="Transaction fees" open={open} onToggle={onFold} />
    {open ? <Stack gap="s">
      <FieldGroup><Field label="Fee mode:"><ComboBox value={preferences.mode} options={modes} onChange={mode => set({ mode })} /></Field></FieldGroup>
      <FeeSourceField label="Provider:" sources={sources.filter(s => s.has_default || s.has_smart)} value={preferences.source} onChange={source => set({ source })} />
    </Stack> : null}
  </Stack>;
}

/* PluginSection (issue #69): drop a ZIP bundle, whatever its filename or extension.
   Silent validates the bundle and admits its native library before sealing it into
   encrypted state, listed off. Admission is not an OS sandbox.
   `added`: the line after a drop ({ name, updated }). */
function PluginDrop({ dragging }) {
  return (
    <Card tone="inset" pad="m" style={dragging ? { outline: '2px dashed var(--accent)', outlineOffset: -2 } : undefined}>
      <Stack align="center" gap="s" style={{ padding: 'var(--space-m) 0' }}>
        <Icon name="puzzle" size={48} tone="muted" />
        <Text as="div" variant="caption" color="muted" align="center">Drop a plugin ZIP bundle on this window to add it. Any filename or extension is accepted; loose libraries, JSON files and folders are not. Built-in modules are not listed here.</Text>
      </Stack>
    </Card>
  );
}

function PluginSection({ plugins, added, notice, result, readError, onRetryState, busyId, dragging, onToggle, onAccess, onRemove, onRetryDisable, open = true, onFold }) {
  return (
    <Stack>
      <SectionHeader label="Plugin Manager" count={plugins.length ? plugins.length : null} open={open} onToggle={onFold} />
      {open ? <Stack gap="s">
        {readError ? <Notice tone="error" title="Could not read pending plugin removals" action={<Btn id="try_again" onClick={onRetryState} />}>Plugin controls are unavailable until application state can be read. Unlock or restore access, then try again. Known removal records have been kept. {readError}</Notice> : null}
        {!readError && notice ? <Notice tone={notice.tone} title={notice.title}>{notice.body}</Notice> : null}
        {!readError && result ? <Text as="div" variant="caption" color="success">{result}</Text> : null}
        {!readError && added ? <Text as="div" variant="caption" color="success">{added.updated
          ? `${added.name} updated: it loads the new version once turned off and on again.`
          : `${added.name} added, off: turn it on to load it.`}</Text> : null}
        {plugins.map(p => (
          <PluginRow key={p.id} plugin={p} busy={busyId === p.id} unavailable={!!readError} onToggle={onToggle} onAccess={onAccess} onRemove={onRemove} onRetryDisable={onRetryDisable} />
        ))}
        <PluginDrop dragging={dragging} />
      </Stack> : null}
    </Stack>
  );
}

function ExtensionSection({ sections, onOpen, open = true, onFold }) {
  if (!sections.length) return null;
  return (
    <Stack>
      <SectionHeader label="Extension Settings" count={sections.length} open={open} onToggle={onFold} />
      {open ? <Stack gap="s">
        {sections.map((s, i) => (
          <SelectRow key={s.id} icon={s.icon || 'settings'} title={s.title || `Section ${i + 1}`} sub={s.module ? `From ${s.module}.` : null}
            onClick={() => onOpen(s.id)} trailing={<Btn id="open" onClick={() => onOpen(s.id)} />} />
        ))}
      </Stack> : null}
    </Stack>
  );
}

/* The frame around a module's own settings widget: the module draws the content. */
function ExtensionFrame({ section }) {
  return (
    <Stack gap="s">
      <Text as="div" variant="body" color="secondary">These settings belong to {section.module}. Changes apply when you leave this page.</Text>
      <Card tone="inset" pad="m">
        <Stack align="center" justify="center" gap="xs" style={{ minHeight: 220 }}>
          <Icon name="puzzle" size={28} tone="muted" />
          <Text variant="caption" color="muted" align="center">{section.module}'s settings widget</Text>
        </Stack>
      </Card>
    </Stack>
  );
}

function DisablePluginConfirm({ plugin }) {
  return (
    <Stack gap="m">
      <Text as="div" variant="body">Disable “{plugin.name}” (<Text variant="mono">{plugin.id}  v{plugin.version}</Text>)? Silent stops all of its modules and unloads it.</Text>
      {plugin.accounts && plugin.accounts.length ? (
        <Notice tone="warning" title={`${plugin.accounts.length === 1 ? '1 open account closes' : plugin.accounts.length + ' open accounts close'}`}>
          {plugin.accounts.join(', ')} {plugin.accounts.length === 1 ? 'comes' : 'come'} from this plugin and will close. Enable the plugin again to reopen {plugin.accounts.length === 1 ? 'it' : 'them'}.
        </Notice>
      ) : <Notice tone="info">No open account uses this plugin.</Notice>}
      {plugin.themes && plugin.themes.length ? <Notice tone="info">Its themes ({plugin.themes.join(', ')}) are removed. If one is in use, Silent switches to Light.</Notice> : null}
    </Stack>
  );
}

function RemovePluginConfirm({ plugin }) {
  return <Stack gap="m" style={{ width: '100%' }}>
    <Text as="div" variant="body">Remove {plugin.name || plugin.id}?</Text>
    <Notice tone="warning">This permanently deletes the installed plugin and all of its saved state and accounts. There is no keep-data option. Reinstalling starts with empty data. Shared signer keys and other plugins' accounts are not deleted.</Notice>
  </Stack>;
}

/* What an external plugin may use (issue #35; src/views/modals/appsettings/AccessFlow.cpp):
   one row per library version answered (sha256, the first 16 hex), Accounts and Keys
   toggles that apply at once, and Forget, after which the plugin is asked again on
   its next use. An unasked grant shows off, named in the sub line. Same body width as the
   main view. */
const grantLabel = { account: 'Accounts', keys: 'Keys', state: 'Saved Data' };
function PluginAccessFlow({ plugin, onChange }) {
  const entries = plugin.access || [];
  const set = (hash, grant, allowed) => onChange(entries.map(e => (e.hash === hash ? { ...e, [grant]: allowed ? 'allowed' : 'denied' } : e)));
  const forget = (hash) => onChange(entries.filter(e => e.hash !== hash));
  return (
    <Stack gap="m" style={{ width: GS_BODY_WIDTH }}>
      <Text as="div" variant="body" color="secondary">What {plugin.name} may use, for each version of its library you answered. A change applies at once. Forget an answer and Silent asks again on the plugin's next use.</Text>
      {entries.length ? <Stack gap="s">
        {entries.map(e => {
          const unasked = ['account', 'keys', 'state'].filter(g => (e[g] || 'unasked') === 'unasked').map(g => grantLabel[g]);
          return (
            <SelectRow key={e.hash} icon="puzzle" title={`Library ${e.hash.slice(0, 8)}…`}
              sub={`${e.current ? 'The version loaded now.' : 'An earlier version.'}${unasked.length ? ` Not asked yet: ${unasked.join(', ')}.` : ''}`}
              chevron={false}
              trailing={
                <Row gap="0" align="center">
                  {['account', 'keys', 'state'].map(g => (
                    <React.Fragment key={g}>
                      <Text variant="caption">{grantLabel[g]}</Text><span style={{ width: 'var(--space-xs)' }} />
                      <Toggle on={e[g] === 'allowed'} onClick={() => set(e.hash, g, e[g] !== 'allowed')} />
                      <span style={{ width: 'var(--space-s)' }} />
                    </React.Fragment>
                  ))}
                  <Btn id="forget_access" onClick={() => forget(e.hash)} />
                </Row>
              } />
          );
        })}
      </Stack> : <Text as="div" variant="caption" color="muted">No answer kept: Silent asks on the plugin's next use.</Text>}
    </Stack>
  );
}

/* Asked on an external plugin's first use of the accounts or the keys, or when it asks
   through Host::requestAccess() (issue #35; src/views/modals/PluginAccessPrompt.cpp).
   Lists only the grants asked. Allow or Deny is kept for this library hash; the × answers
   nothing, so the plugin is asked again next time. */
function PluginAccessPrompt({ plugin, account = true, keys = false, state = false, onAnswer, onClose }) {
  return (
    <Modal title="Allow Plugin Access?" width={520} onClose={onClose}>
      <Stack gap="m">
        <Text as="div" variant="body">{plugin.name} ({plugin.id}  v{plugin.version}) asks to use:</Text>
        <Stack gap="s">
          {account ? <SelectRow icon="coins" title="Accounts" sub="The name, coins, balance, addresses and descriptor of every account." chevron={false} /> : null}
          {keys ? <SelectRow icon="key" title="Keys" sub="Your registered keys: signing requests, xpubs and address checks." chevron={false} /> : null}
          {state ? <SelectRow icon="folder" title="Saved Data" sub="Its own data, kept encrypted with Silent's. A new version of the plugin asks again." chevron={false} /> : null}
        </Stack>
        <Stack gap="xs">
          <Text as="div" variant="caption" color="muted">Library {(plugin.access && plugin.access[0] ? plugin.access[0].hash : '').slice(0, 16)}…</Text>
          <Text as="div" variant="caption" color="secondary">Plugins run inside Silent: allow only one you trust. The answer is kept for this version of the plugin, an update asks again. Change it in Settings, Plugin Manager, Access.</Text>
        </Stack>
      </Stack>
      <ModalActions>
        <Btn id="deny_access" onClick={() => onAnswer && onAnswer(false)} />
        <Btn id="allow_access" onClick={() => onAnswer && onAnswer(true)} />
      </ModalActions>
    </Modal>
  );
}

function GlobalSettingsTab({ theme: themeProp, onTheme, plugins: pluginsIn = PLUGINS, sections: sectionsIn = EXTENSION_SECTIONS, initial = {} }) {
  const { sources } = React.useContext(PriceFeedContext);
  const [themeLocal, setThemeLocal] = React.useState(initial.theme || themeProp || 'Light');
  const theme = themeProp != null && initial.theme == null ? themeProp : themeLocal;
  const [language, setLanguage] = React.useState(initial.language || 'English');
  const [langSaved, setLangSaved] = React.useState(!!initial.langSaved);
  const [plugins, setPlugins] = React.useState(pluginsIn);
  const sections = sectionsIn.filter(s => !s.pluginId || plugins.some(p => p.id === s.pluginId && p.enabled && !p.removing && !p.error));
  const [added, setAdded] = React.useState(initial.added || null);        // null | { name, updated }
  const [notice, setNotice] = React.useState(initial.notice || null);
  const [readError, setReadError] = React.useState(initial.readError || null);
  const [result, setResult] = React.useState(initial.result || null);
  const [busyId, setBusyId] = React.useState(initial.busyId || null);
  const [view, setView] = React.useState(initial.view || null);
  const [folds, setFolds] = React.useState({ general: true, prices: true, fees: true, plugins: true, extensions: true, ...(initial.folds || {}) });   // true = open
  const fold = (k) => setFolds(f => ({ ...f, [k]: !f[k] }));           // null | { section } | { disable }

  const themes = [{ name: 'Light' }, { name: 'Dark' },
    ...plugins.filter(p => p.enabled && !p.error).flatMap(p => (p.themes || []).map(t => ({ name: t, provider: p.name })))];
  const pickTheme = (t) => { setThemeLocal(t); onTheme && onTheme(t); };
  const pickLanguage = (l) => { setLanguage(l); setLangSaved(l !== 'English' || langSaved); };
  const toggle = (p) => {
    setNotice(null);
    if (!p.enabled) return setPlugins(ps => ps.map(x => (x.id === p.id ? { ...x, enabled: true, error: null } : x)));
    setView({ disable: p.id });
  };
  const confirmDisable = (p) => {
    if (readError || busyId === p.id) return;
    setView(null); setBusyId(p.id); setNotice(null); setResult(null);
    setPlugins(ps => ps.map(x => (x.id === p.id ? { ...x, enabled: false, removing: true } : x)));
    setTimeout(() => {
      setBusyId(null);
      if (p.refuseUnload) {
        setNotice({ tone: 'error', title: 'Plugin shutdown or removal failed', body: 'Shutdown failed; plugin remains disabled and loaded. Retry disable to keep saved data, or confirm Remove to erase it.' });
        setPlugins(ps => ps.map(x => x.id === p.id ? { ...x, disableFailed: true, refuseUnload: false, error: 'Shutdown failed; plugin remains disabled and loaded. Retry disable to keep saved data, or confirm Remove to erase it.' } : x));
        return;
      }
      setPlugins(ps => ps.map(x => (x.id === p.id ? { ...x, enabled: false, removing: false, disableFailed: false, error: null } : x)));
      setResult(`${p.id} was disabled. Its saved data was kept.`);
      if ((p.themes || []).includes(theme)) pickTheme('Light');
    }, 900);
  };

  const confirmRemove = p => {
    if (readError || busyId === p.id) return;
    setView(null); setNotice(null); setAdded(null); setBusyId(p.id);
    setResult(`Removing ${p.id}. Waiting for shutdown and private-data cleanup.`);
    setPlugins(ps => ps.map(x => x.id === p.id ? { ...x, enabled: false, removing: true, disableFailed: false } : x));
    /* Preview only: the real host waits for cooperative shutdown and checked cleanup. */
    setTimeout(() => {
      setBusyId(null);
      if (p.removeError || p.refuseUnload) {
        setResult(null);
        setNotice({ tone: 'error', title: 'Plugin shutdown or removal failed', body: p.removeError || 'Unload failed; data and bundle retained. Retry removal.' });
        setPlugins(ps => ps.map(x => x.id === p.id ? { ...x, error: p.removeError || 'Unload failed; data and bundle retained. Retry removal.', removeError: null, refuseUnload: false } : x));
        return;
      }
      setPlugins(ps => ps.filter(x => x.id !== p.id));
      setResult(`${p.id} was removed with its saved state and accounts.`);
      if ((p.themes || []).includes(theme)) pickTheme('Light');
    }, 900);
  };

  const section = view && view.section ? sections.find(s => s.id === view.section) : null;
  const disabling = view && view.disable ? plugins.find(p => p.id === view.disable) : null;
  const accessing = view && view.access ? plugins.find(p => p.id === view.access) : null;
  const removing = view && view.remove ? plugins.find(p => p.id === view.remove) : null;
  const setAccess = (id, access) => setPlugins(ps => ps.map(x => (x.id === id ? { ...x, access } : x)));

  let title = 'Settings', body, actions;
  if (section) {
    title = section.title;
    body = <ExtensionFrame section={section} />;
    actions = <ModalActions onBack={() => setView(null)} backId="all_settings"><Btn id="done" onClick={() => setView(null)} /></ModalActions>;
  } else if (accessing) {
    title = `${accessing.name} Access`;
    body = <PluginAccessFlow plugin={accessing} onChange={(access) => setAccess(accessing.id, access)} />;
    actions = <ModalActions onBack={() => setView(null)} backId="all_settings"><Btn id="done" onClick={() => setView(null)} /></ModalActions>;
  } else if (removing) {
    title = 'Remove';
    body = <RemovePluginConfirm plugin={removing} />;
    actions = <ModalActions onBack={() => setView(null)}><Btn id="remove_plugin" onClick={() => confirmRemove(removing)} /></ModalActions>;
  } else if (disabling) {
    title = 'Disable Plugin';
    body = <DisablePluginConfirm plugin={disabling} />;
    actions = <ModalActions onBack={() => setView(null)}><Btn id="disable_plugin" onClick={() => confirmDisable(disabling)} /></ModalActions>;
  } else {
    body = (
      <ScrollArea style={{ flex: '0 1 auto' }}>
      <Stack gap="s" style={{ width: GS_BODY_WIDTH }}>
        <GeneralSection theme={theme} themes={themes} onTheme={pickTheme} language={language} onLanguage={pickLanguage} langSaved={langSaved} open={folds.general} onFold={() => fold('general')} />
        {sources.length ? <React.Fragment>
          <Divider space="0" />
          <PriceFeedSection open={folds.prices} onFold={() => fold('prices')} />
        </React.Fragment> : null}
        <Divider space="0" />
        <FeeSettingsSection open={folds.fees} onFold={() => fold('fees')} />
        <Divider space="0" />
        <PluginSection plugins={plugins} added={added} notice={notice} result={result} readError={readError} onRetryState={() => { if (!initial.readErrorPersists) setReadError(null); }} busyId={busyId} dragging={!!initial.dragging && !readError} onToggle={toggle} onAccess={(p) => { setNotice(null); setView({ access: p.id }); }} onRemove={p => setView({ remove: p.id })} onRetryDisable={confirmDisable} open={folds.plugins} onFold={() => fold('plugins')} />
        {sections.length ? <Divider space="0" /> : null}
        <ExtensionSection sections={sections} onOpen={(id) => setView({ section: id })} open={folds.extensions} onFold={() => fold('extensions')} />
      </Stack>
      </ScrollArea>
    );
    actions = null;   /* a tab: nothing to close */
  }
  /* As the Keys page: the title over the view, in a centred column. The sections sit
     in a scroll area, inset by its gutters (a scrollbar and --space-xs), the title
     with them; a flow takes the content width of the former modal.
     Qt: AppSettings::setView. */
  const main = !section && !accessing && !disabling && !removing;
  const inset = 'calc(10px + var(--space-xs))';
  const flowW = `calc(${removing ? GS_REMOVE_WIDTH : GS_WIDTH}px - 2 * var(--space-m) - 2px)`;   /* the modal's body width */
  const width = main ? `calc(${GS_BODY_WIDTH}px + 2 * ${inset} + 2 * var(--space-s))`
    : `calc(${flowW} + 2 * var(--space-s))`;
  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0, height: '100%', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)', width, maxWidth: '100%',
        padding: 'var(--space-s)', minHeight: 0, boxSizing: 'border-box' }}>
        <Text as="div" variant="title" style={{ flex: 'none', paddingLeft: main ? inset : 0 }}>{title}</Text>
        {/* centred as in the modal; ModalActions spans the column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 0, '--modal-body-w': flowW }}>
          {body}{actions}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FeeSettingsSection, PriceFeedSection, PluginRow, PluginDrop, GlobalSettingsTab, GeneralSection, PluginSection, ExtensionSection, ExtensionFrame, DisablePluginConfirm, RemovePluginConfirm, PluginAccessFlow, PluginAccessPrompt, GS_WIDTH });
