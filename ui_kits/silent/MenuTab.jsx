/* Silent UI Kit: Menu tab (MenuTab.cpp) + AccountType / CreateAccount / ConfirmDelete
   modals. One create button opens AccountType (AccountType.cpp), which lists the
   account types: the silent payment wallet and the shared MuSig2 wallet, then those of
   the enabled plugins. Picking a type with a restore offers Create (CreateAccount, or
   CreateSharedAccount in Musig.jsx) or Restore from a backup (RestoreAccountModal,
   Settings.jsx); a type with a create entry only starts it at once. */

/* restore: the RestoreAccountModal kind, none for a type that only creates. */
const ACCOUNT_TYPES = [
  { id: 'sp', title: 'Silent Payment Wallet', icon: 'silent', restore: 'sp' },
  { id: 'shared', title: 'Multikey Wallet', icon: 'users', restore: 'musig' },
];

/* musigSim / musigSimKey: the kit simulator's keys + cached xpubs for the wizard (dev only). */
function MenuTab({ wallets, openWallets, onOpen, onCreate, onDelete, onOpenKeys, musigSim, musigSimKey }) {
  const [picking, setPicking] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [restoring, setRestoring] = React.useState(null);   // null | 'sp' | 'musig'
  const [deleting, setDeleting] = React.useState(null);
  return (
    <Stack align="center" justify="center" style={{ flex: 1, overflow: 'auto',
      padding: 'var(--space-xl) var(--space-m)' }}>
      <Text variant="title" align="center">Silent — Silent Payments Wallet</Text>

      <Stack gap="s" style={{ margin: 'var(--space-xl) 0 var(--space-m)' }}>
        {wallets.map(name => {
          const open = openWallets.includes(name);
          return (
            <Row key={name} gap="xs" style={{ opacity: open ? 0.5 : 1 }}>
              <Btn id="open_wallet" label={name} disabled={open} onClick={() => onOpen(name)} />
              {/* Shown, but an open wallet cannot be deleted: close its tab first. */}
              <Btn id="delete_wallet" disabled={open} onClick={() => setDeleting(name)} />
            </Row>
          );
        })}
      </Stack>

      <Btn id="create_account" onClick={() => setPicking(true)} />

      {/* The picker closes before the creator opens: modals never stack. */}
      {picking ? <AccountType types={ACCOUNT_TYPES} onCancel={() => setPicking(false)}
        onCreate={(id) => {
          setPicking(false);
          if (id === 'sp') setCreating(true);
          else if (id === 'shared') setSharing(true);
        }}
        onRestore={(kind) => { setPicking(false); setRestoring(kind); }} /> : null}

      {creating ? <CreateAccount existing={wallets} onOpenKeys={onOpenKeys ? () => { setCreating(false); onOpenKeys(); } : null} onCancel={() => setCreating(false)}
        onCreate={(name) => { onCreate(name); setCreating(false); }} /> : null}
      {sharing ? <CreateSharedAccount key={musigSimKey} {...(musigSim || {})} existing={wallets} onCancel={() => setSharing(false)}
        onCreate={(name) => { onCreate(name); setSharing(false); }} /> : null}
      {restoring && window.RestoreAccountModal ? <RestoreAccountModal kind={restoring} onClose={() => setRestoring(null)} /> : null}
      {deleting ? <ConfirmDelete name={deleting} onCancel={() => setDeleting(null)}
        onConfirm={() => { onDelete(deleting); setDeleting(null); }} /> : null}
    </Stack>
  );
}

/* 3.11 Create account from a key. [Silent Payment] fetches its sp() descriptor (the
   "fetch" context); [Taproot] and [Segwit] its xpubs at 86'/c'/0' and 84'/c'/0'
   ("fetch-xpub"), which give the account its taproot and segwit addresses. Each runs
   the route steps in place of this modal, so modals never stack. */
/* The Electrum server every new regtest account starts with (Qt: REGTEST_ELECTRUM_URL). */
const REGTEST_ELECTRUM_URL = 'minta.wizardsardine.com:60001';
const ENDPOINT_DEFAULTS = {
  Bitcoin: { blindbit: 'https://blindbit.silentpayments.dev', electrum: 'electrum.blockstream.info:50002', auto: true },
  Regtest: { blindbit: 'http://localhost:8080', electrum: REGTEST_ELECTRUM_URL, auto: true },
  Signet: { blindbit: '', electrum: '', auto: false },
  Testnet: { blindbit: '', electrum: '', auto: false },
};
const descriptorRoute = (k) => k.routes.find(r => r === 'qr' || r === 'hot') || null;
/* An xpub also comes from the key's USB device. Qt: KeysModule::xpubRoute. */
const xpubRoute = (k) => k.routes.find(r => r === 'usb' || r === 'qr' || r === 'hot') || null;

function CreateAccount({ existing, keys = window.KEYS, onCancel, onCreate, onOpenKeys, initial = {} }) {
  const [name, setName] = React.useState(initial.name || '');
  const [network, setNetwork] = React.useState(initial.network || 'Regtest');
  const [keyFp, setKeyFp] = React.useState(initial.keyFp || null);
  const [desc, setDesc] = React.useState(initial.desc || null);          // { value, network }
  const [taproot, setTaproot] = React.useState(initial.taproot || null); // { value, network }
  const [segwit, setSegwit] = React.useState(initial.segwit || null);    // { value, network }
  const [fetching, setFetching] = React.useState(null);                 // 'sp' | 'taproot' | 'segwit'
  const [blindbit, setBlindbit] = React.useState(ENDPOINT_DEFAULTS[initial.network || 'Regtest'].blindbit);
  const [electrum, setElectrum] = React.useState(ENDPOINT_DEFAULTS[initial.network || 'Regtest'].electrum);
  const [tests, setTests] = React.useState(initial.tests || {});         // { blindbit, electrum }: 'testing' | 'ok' | { error }

  const runTest = (which, value) => {
    setTests(t => ({ ...t, [which]: 'testing' }));
    setTimeout(() => setTests(t => ({ ...t, [which]: /localhost:8080/.test(value)
      ? { error: `Could not reach ${value}: connection refused. Start the BlindBit server, then test again.` } : 'ok' })), 900);
  };
  const pickNetwork = (n) => {
    setNetwork(n); setKeyFp(null); setDesc(null); setTaproot(null); setSegwit(null);
    const d = ENDPOINT_DEFAULTS[n]; setBlindbit(d.blindbit); setElectrum(d.electrum); setTests({});
    if (d.auto) { runTest('blindbit', d.blindbit); runTest('electrum', d.electrum); }
  };
  React.useEffect(() => { if (!initial.tests && ENDPOINT_DEFAULTS[network].auto) { runTest('blindbit', blindbit); runTest('electrum', electrum); } }, []);

  const netKeys = keys.filter(k => k.network === network);
  const key = netKeys.find(k => k.fp === keyFp);
  const trimmed = name.trim();
  const reason = !trimmed ? 'Enter an account name.'
    : /\s/.test(name) ? 'The account name cannot contain spaces.'
    : existing.includes(trimmed) ? `An account named “${trimmed}” already exists.`
    : !desc ? 'Get the silent payment descriptor of a key first.'
    : desc.network !== network ? `The descriptor is for ${desc.network}, not ${network}. Get it again.`
    : tests.blindbit !== 'ok' || tests.electrum !== 'ok' ? 'Test both backends first.' : null;

  const coin = network === 'Bitcoin' ? 0 : 1;
  const demoXpub = network === 'Bitcoin' ? DEMO_XPUB_M : DEMO_XPUB_T;
  if (fetching === 'sp' && key) {
    return <SigningFlow context="fetch" keyRow={{ fp: key.fp, alias: key.alias, route: descriptorRoute(key) }}
      onCancel={() => setFetching(null)}
      onDone={() => { setDesc({ value: `sp([${key.fp}/352'/${coin}'/0']${demoXpub})#k7f3qz9d`, network }); setFetching(null); }} />;
  }
  if ((fetching === 'taproot' || fetching === 'segwit') && key) {
    const tr = fetching === 'taproot';
    return <SigningFlow context="fetch-xpub" keyRow={{ fp: key.fp, alias: key.alias, route: xpubRoute(key) }}
      onCancel={() => setFetching(null)}
      onDone={() => {
        const value = tr ? `tr([${key.fp}/86'/${coin}'/0']${demoXpub}/<0;1>/*)#p8fcdvc7` : `wpkh([${key.fp}/84'/${coin}'/0']${demoXpub}/<0;1>/*)#203wua0q`;
        (tr ? setTaproot : setSegwit)({ value, network }); setFetching(null);
      }} />;
  }

  return (
    <Modal title="Create Account" width={620} onClose={onCancel}>
      <Stack gap="m">
        <FieldGroup>
          <Field label="Account Name:">
            <Input width={240} placeholder="e.g. savings" value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Network:">
            <ComboBox value={network} options={NETWORKS} onChange={pickNetwork} width={240} />
          </Field>
        </FieldGroup>

        <Stack gap="s">
          <SectionLabel>Key</SectionLabel>
          {netKeys.length ? netKeys.map(k => {
            const route = descriptorRoute(k);
            return (
              <SelectRow key={k.fp} icon={route ? ROUTE_KINDS[route].icon : 'key'} title={k.alias} meta={k.fp}
                sub={route ? `Gets the descriptor with ${ROUTE_KINDS[route].label}.` : 'Only a QR Code or Hot Key route can return a descriptor.'}
                disabled={!route} selected={route ? keyFp === k.fp : undefined}
                onClick={route ? () => { setKeyFp(k.fp); if (keyFp !== k.fp) { setDesc(null); setTaproot(null); setSegwit(null); } } : undefined} />
            );
          }) : keys.length === 0 ? (
            <EmptyState icon="key" title="No Key Registered" subtitle="An account is created from a key. Register one in the Keys tab first."
              action={onOpenKeys ? <Btn id="open_keys_tab" onClick={onOpenKeys} /> : null} />
          ) : (
            <EmptyState icon="key" title={`No Key on ${network}`} />
          )}
          {netKeys.length ? (
            <Row gap="s">
              {/* A fetched one is done: greyed out with a check mark until the key or the network changes. */}
              {[['get_silent_payment', 'sp', desc], ['get_taproot', 'taproot', taproot], ['get_segwit', 'segwit', segwit]].map(([id, what, got]) => (
                <Btn key={id} id={id} disabled={!key || !!got} icon={got ? 'check' : undefined} iconSize={16} iconTone="success"
                  onClick={() => setFetching(what)} />
              ))}
              {!key ? <Text variant="caption">Pick a key first.</Text> : null}
            </Row>
          ) : null}
        </Stack>

        <Stack gap="xs">
          <SectionLabel>Backends</SectionLabel>
          <FieldGroup>
          <EndpointRow label="BlindBit URL:" value={blindbit} onChange={v => { setBlindbit(v); setTests(t => ({ ...t, blindbit: null })); }}
            test={tests.blindbit} onTest={() => runTest('blindbit', blindbit)} />
          <EndpointRow label="Electrum:" value={electrum} onChange={v => { setElectrum(v); setTests(t => ({ ...t, electrum: null })); }}
            test={tests.electrum} onTest={() => runTest('electrum', electrum)} />
          </FieldGroup>
        </Stack>

        <ModalActions reason={reason}>
          <Btn id="create" disabled={!!reason} onClick={() => onCreate(trimmed)} />
        </ModalActions>
      </Stack>
    </Modal>
  );
}

/* Views: types, then the Create / Restore choice of a type that has a restore.
   initial.type opens the choice of that type (kit states). */
function AccountType({ types, onCancel, onCreate, onRestore, initial = {} }) {
  const [picked, setPicked] = React.useState(types.find(t => t.id === initial.type) || null);
  if (picked) {
    return (
      <Modal title={`Account Type · ${picked.title}`} width={520} onClose={onCancel}>
        <Stack gap="s" style={{ alignSelf: 'stretch' }}>
          <SelectRow icon="plus" title="Create" sub="Make a new account from your keys." onClick={() => onCreate(picked.id)} />
          <SelectRow icon="folder" title="Restore" sub="Bring back an account from its backup file." onClick={() => onRestore(picked.restore)} />
          <ModalActions onBack={() => setPicked(null)} />
        </Stack>
      </Modal>
    );
  }
  return (
    <Modal title="Account Type" width={520} onClose={onCancel}>
      {/* The rows span the modal (Qt: setWideBody). */}
      <Stack gap="s" style={{ alignSelf: 'stretch' }}>
        {types.map(t => <SelectRow key={t.id} twoLine icon={t.icon || 'puzzle'} title={t.title}
          onClick={() => t.restore ? setPicked(t) : onCreate(t.id)} />)}
      </Stack>
    </Modal>
  );
}

function ConfirmDelete({ name, onCancel, onConfirm }) {
  return (
    <Modal title="Delete Wallet" width={420} onClose={onCancel}>
      <Stack gap="m">
        <Text as="div" variant="body">Delete wallet “{name}”? This cannot be undone.</Text>
        <ModalActions>
          <Btn id="delete" onClick={onConfirm} />
        </ModalActions>
      </Stack>
    </Modal>
  );
}

Object.assign(window, { MenuTab, AccountType, ACCOUNT_TYPES, CreateAccount, ConfirmDelete, ENDPOINT_DEFAULTS, REGTEST_ELECTRUM_URL });
