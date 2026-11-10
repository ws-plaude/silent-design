/* Silent UI Kit — state simulator (dev chrome, not part of the product).
   Only states the UI itself can't reach (connected hardware, stored keys, frozen
   transient states). Anything clickable in the kit (network, tabs, modals) is not here.
   The screen remounts when a value changes. Simulated devices/keys exist on every network. */

const SIM_DEFAULTS = /*EDITMODE-BEGIN*/{
  "keysDevices": "mixed",
  "keysKeys": "all",
  "keysRegistering": false,
  "musigCached": "some",
  "musigRoutes": "mixed",
  "musigBackend": "electrum"
}/*EDITMODE-END*/;

const SIM_DEVICE_SETS = {
  mixed: { label: 'Mixed (all states)', ids: ['hid-0001', 'hid-0002', 'hid-0003', 'hid-0004', 'hid-0005'] },
  none: { label: 'None connected', ids: [] },
  registered: { label: 'One, registered', ids: ['hid-0001'] },
  unregistered: { label: 'One, not registered', ids: ['hid-0002'] },
  locked: { label: 'One, locked', ids: ['hid-0004'] },
  unsupported: { label: 'One, unsupported', ids: ['hid-0005'] },
  many: { label: 'Many (scrolls)', ids: 'many' },
};
const SIM_KEY_SETS = {
  all: { label: 'All routes', fps: ['73c5da0a', 'f23a9e01', '5be0c7d2', '9a41e6b3'] },
  none: { label: 'None', fps: [] },
  connected: { label: 'One, connected (USB)', fps: ['73c5da0a'] },
  hot: { label: 'One, hot key', fps: ['f23a9e01'] },
  offline: { label: 'One, offline (SD · QR)', fps: ['5be0c7d2'] },
  many: { label: 'Many (scrolls)', fps: 'many' },
};
/* Create Multikey Account, step 2 Xpubs: which account xpubs the app already
   holds (cached from an earlier fetch), and the route each key fetches through. */
const SIM_MUSIG_CACHED = {
  some: { label: 'Some (Carol, Bob)', fps: ['28645006', 'b8688df1'] },
  none: { label: 'None', fps: [] },
  one_missing: { label: 'All but Alice', fps: ['28645006', 'b8688df1', '3f635a63'] },
  all: { label: 'All', fps: 'all' },
};
const SIM_MUSIG_ROUTES = {
  mixed: { label: 'Mixed (QR · USB · hot)', route: null },
  qr: { label: 'All QR', route: 'qr' },
  usb: { label: 'All USB', route: 'usb' },
  sd: { label: 'All SD card', route: 'sd' },
  hot: { label: 'All hot keys', route: 'hot' },
};
function simMusigProps(t) {
  const r = (SIM_MUSIG_ROUTES[t.musigRoutes] || SIM_MUSIG_ROUTES.mixed).route;
  const keys = MUSIG_KEYS.map(k => (r ? { ...k, route: r } : k));
  const c = (SIM_MUSIG_CACHED[t.musigCached] || SIM_MUSIG_CACHED.some).fps;
  return { keys, initial: { fetched: c === 'all' ? keys.map(k => k.fp) : c } };
}

/* A Multikey account's blockchain backend: Electrum, a plugin installed, or a plugin no
   longer installed (the account opens on Settings, its fund panels not built). */
const SIM_MUSIG_BACKENDS = {
  electrum: { label: 'Electrum (built-in)', id: '' },
  plugin: { label: 'Bitcoin Core plugin', id: 'bitcoind' },
  missing: { label: 'A plugin not installed', id: 'electrs' },
};
function simWallet(wallet, t) {
  if (wallet.kind !== 'musig') return wallet;
  return { ...wallet, blockchainBackend: (SIM_MUSIG_BACKENDS[t.musigBackend] || SIM_MUSIG_BACKENDS.electrum).id };
}

const simHex = (i) => ((0x1a2b3c4d + i * 0x9e3779b1) >>> 0).toString(16).padStart(8, '0').slice(0, 8);

function simKeysProps(t) {
  const onAll = (list) => NETWORKS.flatMap(network => list.map(x => ({ ...x, network })));
  const ds = SIM_DEVICE_SETS[t.keysDevices] || SIM_DEVICE_SETS.mixed;
  let devices = ds.ids === 'many'
    ? Array.from({ length: 12 }, (_, i) => ({ ...DEVICES[i % DEVICES.length], id: 'hid-sim-' + i,
        fp: DEVICES[i % DEVICES.length].fp ? simHex(i) : null }))
    : ds.ids.map(id => DEVICES.find(d => d.id === id));
  devices = onAll(devices);

  const ks = SIM_KEY_SETS[t.keysKeys] || SIM_KEY_SETS.all;
  const base = KEYS.filter(k => k.network === 'Signet');
  let keys = ks.fps === 'many'
    ? Array.from({ length: 14 }, (_, i) => ({ ...base[i % base.length], fp: i < base.length ? base[i].fp : simHex(100 + i),
        alias: base[i % base.length].alias + (i < base.length ? '' : ' ' + (i + 1)) }))
    : ks.fps.map(fp => KEYS.find(k => k.fp === fp));
  keys = onAll(keys);

  const regTarget = devices.find(d => d.state === 'ready' && d.fp && !keys.some(k => k.fp === d.fp));
  return {
    initialDevices: devices, initialKeys: keys,
    initialRegistering: t.keysRegistering && regTarget ? regTarget.id : null,
  };
}

function KitSimPanel({ t, setTweak }) {
  const opt = (sets) => Object.entries(sets).map(([value, s]) => ({ value, label: s.label }));
  return (
    <TweaksPanel title="Simulate">
      <TweakSection label="Keys tab" />
      <TweakSelect label="Connected devices" value={t.keysDevices} options={opt(SIM_DEVICE_SETS)} onChange={v => setTweak('keysDevices', v)} />
      <TweakSelect label="Stored keys" value={t.keysKeys} options={opt(SIM_KEY_SETS)} onChange={v => setTweak('keysKeys', v)} />
      <TweakToggle label="Freeze “registering”" value={t.keysRegistering} onChange={v => setTweak('keysRegistering', v)} />
      <TweakSection label="Multikey wizard · Xpubs" />
      <TweakSelect label="Xpubs already held" value={t.musigCached} options={opt(SIM_MUSIG_CACHED)} onChange={v => setTweak('musigCached', v)} />
      <TweakSelect label="Key routes" value={t.musigRoutes} options={opt(SIM_MUSIG_ROUTES)} onChange={v => setTweak('musigRoutes', v)} />
      <TweakSection label="Multikey account" />
      <TweakSelect label="Blockchain backend" value={t.musigBackend} options={opt(SIM_MUSIG_BACKENDS)} onChange={v => setTweak('musigBackend', v)} />
    </TweaksPanel>
  );
}

Object.assign(window, { SIM_DEFAULTS, simKeysProps, simMusigProps, simWallet, KitSimPanel });
