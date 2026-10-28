/* Silent UI Kit — sample data (fake; mirrors RustCoin / payment-history shapes). */

const SP_ADDRESS = 'sp1qqgste7k9hx0qftg6qmwlkqtwuy6cycyavzmzj85c6qdfhjdpdjtdgqjuexzk6murw56suy3e0rd2cgqvycxttddwsvgxe2usfpxumr70xc9pkqwv';

const WALLETS = {
  savings: {
    name: 'savings',
    network: 'Signet',
    blindbit: 'https://blindbit.silentpayments.dev',
    electrum: 'signet.electrum.silent:50001',
    electrumHeight: '812519',
    blindbitHeight: '812519',
    confirmed: '0.04827310 BTC', confirmedCount: '4 coins',
    unconfirmed: '0.00051200 BTC', unconfirmedCount: '1 coin',
    coins: [
      { type: 'Segwit',  height: '812043',      date: '2026-10-17 09:42', outpoint: '3a9f2c…1d4e:0', label: 'Cold storage', value: '0.02000000' },
      { type: 'Taproot', height: '811920',      date: '2026-10-16 13:05', outpoint: '7b1e84…9c0f:1', label: 'Exchange withdrawal', value: '0.01500000' },
      { type: 'Segwit',  height: '809514',      date: '2026-09-29 18:20', outpoint: 'c40d77…2a8b:0', label: '', value: '0.01000000' },
      { type: 'Taproot', height: '812518',      date: '2026-10-20 11:58', outpoint: 'e18a30…ff21:2', label: 'Payroll', value: '0.00327310' },
      { type: 'Segwit',  height: 'Unconfirmed', date: '', outpoint: '9d22b6…6e74:0', label: '', value: '0.00051200' },
    ],
    history: [
      { dir: 'Incoming', txid: '3a9f2c…a1d4e0', height: '812043', date: '2026-10-17 09:42', label: 'Cold storage', amount: '0.02000000' },
      { dir: 'Incoming', txid: '7b1e84…b9c0f1', height: '811920', date: '2026-10-16 13:05', label: 'Exchange withdrawal', amount: '0.01500000' },
      { dir: 'Self', txid: '2b7d40…91fa3c', height: '811402', date: '2026-10-12 16:27', label: 'Consolidation', amount: '0.00012400' },
      { dir: 'Outgoing', txid: 'f55c19…0e7733', height: '810882', date: '2026-10-08 20:14', label: 'Rent', amount: '0.00840000' },
      { dir: 'Incoming', txid: 'c40d77…c2a8b0', height: '809514', date: '2026-09-29 18:20', label: '', amount: '0.01000000' },
      { dir: 'Incoming', txid: 'e18a30…dff212', height: '812518', date: '2026-10-20 11:58', label: 'Payroll', amount: '0.00327310' },
      { dir: 'Incoming', txid: '9d22b6…56e740', height: 'Unconfirmed', date: '', label: '', amount: '0.00051200' },
    ],
  },
  'cold-storage': {
    name: 'cold-storage',
    network: 'Bitcoin',
    blindbit: 'https://blindbit.example.com',
    electrum: 'electrum.example.com:50002',
    confirmed: '0.50000000 BTC', confirmedCount: '1 coin',
    unconfirmed: '0.00000000 BTC', unconfirmedCount: '0 coins',
    coins: [
      { type: 'Taproot', height: '801200', date: '2025-07-14 07:31', outpoint: 'aa11bb…cc22:0', label: 'Deep cold', value: '0.50000000' },
    ],
    history: [
      { dir: 'Incoming', txid: 'aa11bb…22cc00', height: '801200', date: '2025-07-14 07:31', label: 'Deep cold', amount: '0.50000000' },
    ],
  },
  /* A Multikey Wallet (kind 'musig', MusigAccountController): Taproot coins only, one
     Electrum server and no BlindBit, its descriptor and cosigners in Settings. */
  multikey: {
    name: 'multikey',
    kind: 'musig',
    network: 'Regtest',
    electrum: 'minta.wizardsardine.com:60001',
    electrumHeight: '1220',
    descriptor: "tr(musig([73c5da0a/87'/1'/0'/2]tpubDEGU7K8ab62XbG1bKoCnHDtUx44DxVKyAQVS96EN1EUVTQRW2KnFEvTtmnUJSonudSK8HcXTexf56Kir1JzoQAzFRHfvNLEcqV7KxUHZVYa,[b8688df1/87'/1'/0'/2]tpubDDzMtUDKwjvTehAmAfwYiBGzUFDcF8AyEaJf78JhQam5knvsGTgqF7VvhuuDZLYityND66FG88sS3q28Yi5Ysumvx5DfMgdm6nc6zntvpHM)/<0;1>/*)#cr6rql33",
    cosigners: '73c5da0a, b8688df1',
    /* its policy (the spend paths it was created with): the MuSig2 key path of both cosigners */
    paths: [{ label: 'Key path', threshold: 2, mandatory: [], locktime: 'No timelock', lockValue: '', lockUnit: 'Blocks', lockDate: '', keys: { '73c5da0a': 'Internal', 'b8688df1': 'External' } }],
    confirmed: '0.01200000 BTC', confirmedCount: '2 coins',
    unconfirmed: '0.00150000 BTC', unconfirmedCount: '1 coin',
    coins: [
      { type: 'Taproot', height: 'Unconfirmed', date: '', outpoint: '8f03ac…41d2:0', label: 'Refund', value: '0.00150000' },
      { type: 'Taproot', height: '1204', date: '2026-10-20 08:10', outpoint: '5c9e01…7a3d:0', label: 'Funding', value: '0.01000000' },
      { type: 'Taproot', height: '1211', date: '2026-10-20 12:47', outpoint: 'd2f48b…09e6:1', label: '', value: '0.00200000' },
    ],
    history: [
      { dir: 'Incoming', txid: '8f03ac…e41d20', height: 'Unconfirmed', date: '', label: 'Refund', amount: '0.00150000' },
      { dir: 'Outgoing', txid: '7e3a19…c40b52', height: '1218', date: '2026-10-20 14:05', label: 'Supplier', amount: '0.00350000' },
      { dir: 'Self', txid: 'b91c6d…2f08e7', height: '1215', date: '2026-10-20 13:30', label: 'Consolidation', amount: '0.00008200' },
      { dir: 'Incoming', txid: '5c9e01…e7a3d0', height: '1204', date: '2026-10-20 08:10', label: 'Funding', amount: '0.01000000' },
      { dir: 'Incoming', txid: 'd2f48b…a09e61', height: '1211', date: '2026-10-20 12:47', label: '', amount: '0.00200000' },
    ],
  },
};

// Wallets shown in the Menu tab list (some openable)
const KNOWN_WALLETS = ['savings', 'cold-storage', 'testing', 'multikey'];

const NETWORKS = ['Regtest', 'Signet', 'Testnet', 'Bitcoin'];

const MNEMONIC_WORDS = 'vault echo silent ridge amber cosmic pledge orbit timber walnut velvet jungle harbor signal modest crater nimble fabric'.split(' ');

function fakeMnemonic() {
  const w = [...MNEMONIC_WORDS];
  for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
  return w.slice(0, 12).join(' ');
}

/* ---------------- Keys, devices (issue #2) ----------------
   Keys are per network. `routes` is ordered (first = primary). `hasHot` = a sealed
   mnemonic is stored on this computer. Devices are the hardware wallets connected
   right now; `fp` is null when the device can't report it (locked / unsupported). */
const DEMO_XPUB_T = 'tpubDCtKfsNyRhULjZ9XMS4VKKtVcPdVDi8MKUbcSD9MJDyjRu1A2ND5MiipozyyspBT9bg8upEp7a8EAgFxNxXn1d7QkdbL52Ty5jiSLcxPt1P';
const DEMO_XPUB_M = 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const desc = (fp, path, xpub) => `sp([${fp}/${path.replace(/^m\//, '')}]${xpub}/<0;1>/*)#7q9zr3kd`;

const KEYS = [
  { fp: '73c5da0a', alias: 'Daily Ledger', network: 'Signet', routes: ['usb', 'qr'], hasHot: false,
    devicesSeen: [{ brand: 'Ledger', model: 'Nano S Plus', module: 'Ledger' }],
    xpubs: [{ path: "m/84'/1'/0'", xpub: DEMO_XPUB_T, used: true }, { path: "m/86'/1'/0'", xpub: DEMO_XPUB_T.replace('CtK', 'Rw8'), used: false }],
    descriptors: [
      { desc: desc('73c5da0a', "m/352'/1'/0'", DEMO_XPUB_T), registered: true, account: 'savings', module: 'SP Accounts' },
      { desc: desc('73c5da0a', "m/352'/1'/1'", DEMO_XPUB_T.replace('Lj', 'Qm')), registered: false, account: 'testing', module: 'SP Accounts' },
      { desc: `tr(${DEMO_XPUB_T}/<2147483646;2147483647>/*,pk(musig([73c5da0a/87'/1'/0'/2]${DEMO_XPUB_T},[5be0c7d2/87'/1'/0'/1]${DEMO_XPUB_T.replace('ULj', 'Vv3')})/<512;513>/*))`, registered: true, account: 'shared', module: 'MuSig2 Accounts' },
    ] },
  { fp: 'f23a9e01', alias: 'Laptop Hot Key', network: 'Signet', routes: ['hot'], hasHot: true,
    devicesSeen: [], xpubs: [{ path: "m/84'/1'/0'", xpub: DEMO_XPUB_T.replace('Ctk', 'Hk2'), used: false }], descriptors: [] },
  { fp: '5be0c7d2', alias: 'Vault Coldcard', network: 'Signet', routes: ['sd', 'qr'], hasHot: false,
    devicesSeen: [{ brand: 'Coldcard', model: 'Q', module: 'Coldcard' }],
    xpubs: [], descriptors: [{ desc: desc('5be0c7d2', "m/352'/1'/0'", DEMO_XPUB_T.replace('ULj', 'Vv3')), registered: true, account: 'savings' }] },
  { fp: '9a41e6b3', alias: 'Backup Key', network: 'Signet', routes: ['hot', 'usb', 'sd'], hasHot: true,
    devicesSeen: [{ brand: 'BitBox', model: 'BitBox02', module: 'BitBox' }], xpubs: [], descriptors: [] },
  { fp: '0d6f2c88', alias: 'Cold Ledger', network: 'Bitcoin', routes: ['usb'], hasHot: false,
    devicesSeen: [{ brand: 'Ledger', model: 'Nano X', module: 'Ledger' }],
    xpubs: [{ path: "m/84'/0'/0'", xpub: DEMO_XPUB_M, used: true }],
    descriptors: [{ desc: desc('0d6f2c88', "m/352'/0'/0'", DEMO_XPUB_M), registered: true, account: 'cold-storage' }] },
];

const DEVICES = [
  { id: 'hid-0001', brand: 'Ledger', model: 'Nano S Plus', fp: '73c5da0a', state: 'ready', network: 'Signet', kind: 'Ledger', firmware: '1.4.1' },
  { id: 'hid-0002', brand: 'Coldcard', model: 'Mk4', fp: '7e02da41', state: 'ready', network: 'Signet', kind: 'Coldcard', firmware: '5.4.0' },
  { id: 'hid-0003', brand: 'Blockstream', model: 'Jade', fp: 'c0e1a7f4', state: 'ready', network: 'Signet', kind: 'Jade', firmware: '1.0.31',
    registerError: 'The device disconnected before it returned its xpub. Reconnect it and try again.' },
  { id: 'hid-0004', brand: 'BitBox', model: 'BitBox02', fp: null, state: 'locked', network: 'Signet', kind: 'BitBox',
    detail: 'Enter the PIN on the device to unlock it.' },
  { id: 'hid-0005', brand: 'Trezor', model: 'Model One', fp: null, state: 'unsupported', network: 'Signet', kind: 'Trezor',
    detail: 'This model does not support silent payments.' },
];

const DEVICE_STATE = {
  ready: { label: 'Ready', tone: 'success' },
  locked: { label: 'Locked', tone: 'warning' },
  unsupported: { label: 'Unsupported', tone: 'error' },
};

/* Signing plans: one row per key the transaction needs. `status` is the plan's
   verdict for that key; `route` is the route it will use (null when none). */
/* ---------------- Global settings (issue #4) ---------------- */
const LANGUAGES = ['English', 'Français', 'Italiano', 'Deutsch', 'Português', 'Español'];
/* External plugins found in ~/.silent/plugins/ (built-in modules are never listed). */
const PLUGINS = [
  { id: 'atomic-swaps', name: 'Atomic Swaps', version: '0.3.0', desc: 'Swap accounts and two extra themes.', enabled: true,
    themes: ['Midnight', 'Paper'], accounts: ['swaps'],
    /* the answers kept per library sha256 (issue #35): 'allowed' | 'denied' | 'unasked' */
    access: [
      { hash: '65204c326c3fd005ced16aebdad968d2c2ac42426ea6a64afddd9fcfc6cfc31f', current: true, account: 'allowed', keys: 'denied', state: 'allowed' },
      { hash: '9b1e07a4c2d85f3361e0aa4f8b27c9d05e6f13b2a4c89d7e0f1a2b3c4d5e6f70', current: false, account: 'allowed', keys: 'unasked', state: 'allowed' },
    ] },
  { id: 'payjoin', name: 'Payjoin', version: '1.2.3', desc: 'Payjoin sending and receiving.', enabled: false },
  { id: 'nostr-backup', name: 'Nostr Backup', version: '0.1.4', enabled: true,
    error: 'Could not load: the plugin was built for a newer Silent (needs 0.9, this is 0.8).' },
];
const EXTENSION_SECTIONS = [
  { id: 'hw', title: 'Hardware Wallets', module: 'Hardware Wallets', icon: 'usb' },
  { id: 'swaps', title: 'Atomic Swaps', module: 'Atomic Swaps', pluginId: 'atomic-swaps', icon: 'puzzle' },
];
/* Demo stand-in for the BIP39 English list (the app checks the real 2048 words). */
const BIP39_DEMO = new Set([...MNEMONIC_WORDS, 'lumber', 'quarter', 'solar', 'tiny', 'wisdom', 'zebra', 'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident', 'account', 'zoo']);
const isBip39 = (w) => BIP39_DEMO.has(w);
Object.assign(window, { BIP39_DEMO, isBip39, LANGUAGES, PLUGINS, EXTENSION_SECTIONS });

const SIGNING_PLAN = [
  { fp: '73c5da0a', alias: 'Daily Ledger', route: 'usb', status: 'first', device: 'Ledger Nano S Plus' },
  { fp: 'f23a9e01', alias: 'Laptop Hot Key', route: 'hot', status: 'waiting' },
];
const SIGNING_PLAN_ALL = [
  { fp: '73c5da0a', alias: 'Daily Ledger', route: 'usb', status: 'first', device: 'Ledger Nano S Plus' },
  { fp: '5be0c7d2', alias: 'Vault Coldcard', route: 'qr', status: 'ready' },
  { fp: 'f23a9e01', alias: 'Laptop Hot Key', route: 'hot', status: 'waiting' },
  { fp: '9a41e6b3', alias: 'Backup Key', route: 'usb', status: 'disconnected', device: 'BitBox02' },
  { fp: '3e8d1f20', alias: 'Old Hot Key', route: null, status: 'no_hot' },
  { fp: '6c2a90bd', alias: 'Spare Key', route: null, status: 'no_route' },
  { fp: 'e4b27a19', alias: null, route: null, status: 'unregistered' },
];
const VERIFY_PLAN = [
  { fp: '73c5da0a', alias: 'Daily Ledger', route: 'usb', status: 'ready', device: 'Ledger Nano S Plus' },
  { fp: '5be0c7d2', alias: 'Vault Coldcard', route: 'qr', status: 'ready' },
  /* a hot key: no screen to show the address on */
  { fp: '3f635a63', alias: 'Hot Spending', route: 'hot', status: 'no_route' },
];
/* A silent payment address is only checked over QR codes: no USB device protocol
   supports it. */
const SP_VERIFY_PLAN = VERIFY_PLAN.filter(r => r.route === 'qr');
const OTHER_DEVICES = [{ name: 'Coldcard Mk4', fp: '7e02da41' }];

Object.assign(window, { SIGNING_PLAN, SIGNING_PLAN_ALL, VERIFY_PLAN, SP_VERIFY_PLAN, OTHER_DEVICES });

/* UI stand-in for Host::selectedPrice(), not a network feed. Mainline has no feeds. */
const PriceFeedContext = React.createContext({ sources: [], price: { source: '', currency: '', rate: null }, selectPrice: () => {} });
function PriceFeedProvider({ sources = [], initialSelection = { source: '', currency: '' }, children }) {
  const [selection, setSelection] = React.useState(initialSelection);
  const source = sources.find(s => s.id === selection.source);
  const rate = source && source.currencies.includes(selection.currency) ? (source.rates || {})[selection.currency] : null;
  const price = { ...selection, rate: Number.isFinite(rate) && rate > 0 ? rate : null };
  return <PriceFeedContext.Provider value={{ sources, price, selectPrice: (source, currency) => setSelection({ source, currency }) }}>{children}</PriceFeedContext.Provider>;
}

/* Explicit gallery quotes only. No source or currency is selected by default. */
const PRICE_FEED_SOURCES = [
  { id: '["prices","feed","primary"]', name: 'Price Feed A', currencies: ['EUR', 'USD'], rates: { EUR: 60000, USD: 68000 } },
  { id: '["prices","feed","secondary"]', name: 'Price Feed B', currencies: ['USD'], rates: { USD: 70000 } },
];
Object.assign(window, { PriceFeedContext, PriceFeedProvider, PRICE_FEED_SOURCES });

const FEE_PREFERENCES = { mode: 'Manual', source: '' };
const FeeFeedContext = React.createContext({ sources: [], preferences: FEE_PREFERENCES, selectFees: () => {}, rate: () => null });
function FeeFeedProvider({ sources = [], initialPreferences = FEE_PREFERENCES, children }) {
  const [preferences, setPreferences] = React.useState(() => ({ mode: initialPreferences.mode, source: initialPreferences.source || '' }));
  const selectFees = ({ mode, source }) => setPreferences({ mode, source });
  const rate = (mode, tier) => {
    const source = sources.find(s => s.id === preferences.source);
    const value = mode === 'Default' && source && source.has_default ? source.defaultRate
      : mode === 'Smart' && source && source.has_smart ? (source.smartRates || {})[tier] : null;
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  return <FeeFeedContext.Provider value={{ sources, preferences, selectFees, rate }}>{children}</FeeFeedContext.Provider>;
}

/* Capability-specific gallery fixtures, not providers selected by the app. */
const FEE_FEED_SOURCES = [
  { id: '["fees","feed","default"]', name: 'Default Feed', has_default: true, has_smart: false, defaultRate: 0.5 },
  { id: '["fees","feed","smart"]', name: 'Smart Feed', has_default: false, has_smart: true, smartRates: { Low: 0.25, Medium: 0.75, Fast: 2 } },
  { id: '["fees","feed","combined"]', name: 'Combined Feed', has_default: true, has_smart: true, defaultRate: 3, smartRates: { Low: 1, Medium: 2, Fast: 4 } },
];
Object.assign(window, { FeeFeedContext, FeeFeedProvider, FEE_PREFERENCES, FEE_FEED_SOURCES });

const defaultXpubPath = (network) => (network === 'Bitcoin' ? "m/84'/0'/0'" : "m/84'/1'/0'");
const deviceName = (d) => (d.brand && d.model && !d.model.startsWith(d.brand) ? `${d.brand} ${d.model}` : d.model || d.brand);

Object.assign(window, { SP_ADDRESS, WALLETS, KNOWN_WALLETS, NETWORKS, fakeMnemonic, MNEMONIC_WORDS,
  KEYS, DEVICES, DEVICE_STATE, defaultXpubPath, deviceName, DEMO_XPUB_T, DEMO_XPUB_M });
