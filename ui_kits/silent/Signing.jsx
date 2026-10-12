/* Silent UI Kit — Signer picker + route steps (issue #2 §3.7–3.10).
   SigningFlow is ONE modal: picker → route step → (verify result) — each step
   replaces the previous one. Three contexts set the copy: sign | verify | fetch.
   Cancelling returns quietly; it is never reported as a failure. */

const FLOW_COPY = {
  sign: {
    title: 'Sign Transaction', pickerLead: 'Each key below must sign this transaction.',
    usbTitle: 'Confirm on the Device', usbWait: d => `Review the transaction on ${d} and approve it.`,
    qrTitle: 'Show Transaction', qrHint: 'Scan this code with the signing device.',
    scanTitle: 'Scan Signed Transaction', scanHint: 'Hold the signed transaction code from the device in front of the camera.',
    sdTitle: 'Sign with SD Card', hotPrompt: a => `Enter the password of “${a}” to sign the transaction.`, hotBtn: 'sign_hot', hotBusy: 'Signing the transaction…',
  },
  verify: {
    title: 'Verify Address', pickerLead: 'Pick the device to check this address on.',
    usbTitle: 'Check on the Device', usbWait: d => `Check that ${d} shows the same address as below, then confirm on the device.`,
    qrTitle: 'Show Address Request', qrHint: 'Scan this code with the device. It derives the address and shows it.',
    scanTitle: 'Scan the Device Answer', scanHint: 'Hold the answer code from the device in front of the camera.',
    sdTitle: 'Verify with SD Card', hotPrompt: a => `Enter the password of “${a}” to check this address.`, hotBtn: 'check_address', hotBusy: 'Checking the address…',
  },
  fetch: {
    title: 'Get Descriptor', pickerLead: '',
    usbTitle: 'Confirm on the Device', usbWait: d => `Approve the silent payment descriptor export on ${d}.`,
    qrTitle: 'Show Descriptor Request', qrHint: 'Scan this code with the device to request its silent payment descriptor.',
    scanTitle: 'Scan Descriptor', scanHint: 'Hold the descriptor code from the device in front of the camera.',
    sdTitle: 'Descriptor from SD Card', hotPrompt: a => `Enter the password of “${a}” to get its silent payment descriptor.`, hotBtn: 'get_descriptor_hot', hotBusy: 'Getting the descriptor…',
  },
  /* An account's taproot or segwit xpub: from the key's cache, else over its USB, QR or hot route. */
  'fetch-xpub': {
    title: 'Get Xpub', pickerLead: '',
    usbTitle: 'Confirm on the Device', usbWait: d => `Approve the xpub export on ${d}.`,
    qrTitle: 'Show Xpub Request', qrHint: 'Scan this code with the device to request its xpub.',
    scanTitle: 'Scan Xpub', scanHint: 'Hold the xpub code from the device in front of the camera.',
    sdTitle: 'Get Xpub', hotPrompt: a => `Enter the password of “${a}” to get its xpub.`, hotBtn: 'get_xpub_hot', hotBusy: 'Getting the xpub…',
  },
  /* A payment address read off a plain QR code (Send), no device involved: only the scan. */
  'scan-address': {
    scanTitle: 'Scan Address', scanHint: 'Show the address QR code to the camera.',
  },
};

const SIGNER_STATUS = {
  first: { label: 'Signs First', tone: 'success', usable: true, sub: () => 'Silent payment key. It signs before the other keys.' },
  ready: { label: 'Ready', tone: 'success', usable: true, sub: r => `Signs with ${ROUTE_KINDS[r.route].label}.` },
  signed: { label: 'Signed', tone: 'success', usable: false, done: true, sub: () => 'Signature added.' },
  waiting: { label: 'Waiting', tone: 'off', usable: false, sub: () => 'Signs after the silent payment key.' },
  disconnected: { label: 'Not Connected', tone: 'warning', usable: false, sub: r => `Connect and unlock ${r.device || 'the device'}.` },
  no_hot: { label: 'No Hot Secret', tone: 'warning', usable: false, sub: () => 'The mnemonic of this key is not stored on this computer.' },
  no_route: { label: 'No Usable Route', tone: 'error', usable: false, sub: () => 'None of this key’s routes can sign. Add one in the Keys tab.' },
  unregistered: { label: 'Not Registered', tone: 'error', usable: false, sub: () => 'This fingerprint is not a key on this computer. Add it in the Keys tab.' },
};

/* ---------------- 3.7 Signer picker ---------------- */

function SignerPicker({ context = 'sign', plan = [], others = [], onPick, onCancel }) {
  const c = FLOW_COPY[context];
  return (
    <Stack gap="m">
      {plan.length ? (
        <React.Fragment>
          {c.pickerLead ? <Text as="div" variant="body" color="secondary">{c.pickerLead}</Text> : null}
          <Stack gap="s">
            {plan.map(r => {
              const s = SIGNER_STATUS[r.status];
              return (
                <SelectRow key={r.fp} icon={r.route ? ROUTE_KINDS[r.route].icon : 'key'}
                  title={r.alias || 'Unknown Key'} sub={s.sub(r)} meta={r.fp}
                  status={<Pill id={'signer_' + r.status} />}
                  disabled={!s.usable && !s.done} onClick={s.usable ? () => onPick(r) : undefined} />
              );
            })}
          </Stack>
        </React.Fragment>
      ) : (
        <EmptyState icon="key" title="No Signer Available"
          subtitle={context === 'verify' ? 'No key of this account can show addresses. Add a USB or QR route in the Keys tab.' : 'No key of this account is registered on this computer. Add one in the Keys tab.'} />
      )}
      {others.length ? (
        <Stack gap="s">
          <SectionLabel>Other Connected Devices</SectionLabel>
          {others.map(d => (
            <SelectRow key={d.fp} icon="usb" title={d.name} meta={d.fp}
              sub={context === 'sign' ? 'Not needed for this transaction.' : 'Not a key of this account.'} disabled />
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

/* ---------------- 3.8 Route steps ---------------- */

const USB_ERRORS = {
  rejected: { title: 'Rejected on the Device', body: d => `${d} declined the request. Nothing was signed.` },
  disconnected: { title: 'Device Disconnected', body: d => `${d} was disconnected. Reconnect and unlock it, then try again.` },
  failed: { title: 'The Device Did Not Answer', body: d => `${d} stopped responding. Unplug it, plug it back in, then try again.` },
};

function UsbStep({ context = 'sign', device, error, onCancel, onRetry, onBack }) {
  const c = FLOW_COPY[context];
  if (error) {
    const e = USB_ERRORS[error] || USB_ERRORS.failed;
    return (
      <Stack gap="m">
        <ModalStatus icon="circle_x" iconColor="var(--error)" title={e.title} subtitle={e.body(device)} pad="var(--space-m) 0 0" />
        <ModalActions onBack={onBack} backId="other_signer">
          <Btn id="try_again" onClick={onRetry} />
        </ModalActions>
      </Stack>
    );
  }
  return (
    <Stack gap="m">
      <ModalStatus spinner title={c.usbTitle} subtitle={c.usbWait(device)} pad="var(--space-m) 0 0" />
    </Stack>
  );
}

function SdStep({ context = 'sign', fileBase = 'savings', phase: initialPhase = 'save', error: initialError = null, onCancel, onDone }) {
  const [phase, setPhase] = React.useState(initialPhase);     // save | load
  const [error, setError] = React.useState(initialError);     // null | 'write' | 'read'
  const unsigned = `${fileBase}-unsigned.psbt`;
  const signed = `${fileBase}-signed.psbt`;
  const steps = [
    { n: 1, title: 'Save the unsigned transaction', body: <React.Fragment>Silent saves <Text variant="mono" size="inherit">{unsigned}</Text>. Copy it to the SD card.</React.Fragment> },
    { n: 2, title: 'Sign on the device, then load the signed file', body: <React.Fragment>Insert the card in the device, sign, then load <Text variant="mono" size="inherit">{signed}</Text> back.</React.Fragment> },
  ];
  return (
    <Stack gap="m">
      {steps.map(s => {
        const active = (phase === 'save' ? 1 : 2) === s.n;
        const done = phase === 'load' && s.n === 1;
        return (
          <SelectRow key={s.n} icon={done ? 'circle_check' : 'sd_card'} title={`${s.n}. ${s.title}`} sub={s.body}
            current={active} status={done ? <Pill id="sd_step_done" /> : null} disabled={!active && !done} />
        );
      })}
      {error === 'write' ? <Notice tone="error" title="Could not save the file">The SD card is full or read-only. Check the card, then try again.</Notice> : null}
      {error === 'read' ? <Notice tone="error" title="Could not read the signed file">The file is not a signed transaction for this wallet. Pick the file the device wrote.</Notice> : null}
      <ModalActions>
        {phase === 'save'
          ? <Btn id={error === 'write' ? 'try_again' : 'save_unsigned_psbt'} onClick={() => { setError(null); setPhase('load'); }} />
          : <Btn id={error === 'read' ? 'pick_another_file' : 'load_signed_psbt'} onClick={() => { setError(null); onDone && onDone(); }} />}
      </ModalActions>
    </Stack>
  );
}

const QR_PAYLOAD = 'cHNidP8BAHECAAAAAfwzq1kY2hVi9k3lQ8nT0pXrWb7mGv4Lh2Jd9sKfP1aoAAAAAAAD9____AoCWmAAAAAAAFgAUq3Zr8tN1dJ0hLmC4wVfYx2kPbT5AQg8AAAAAABYAFLuh7cP2mZ9oXkqR3sVbTtMu1nQwAAAAAAEBH0BCDwAAAAAAFgAU8aQxk2nF0pZ7Lm3vBtWcYxRd9KsiBgL0nT8qWvLh2Jd9sKfP1ao9k3lQ8nT0pXrWb7mGv4Lh0Yz1a8tVAAAA';

/* QR Settings: contrast, density and speed of a QR code that keeps playing, shown
   above the steppers (`children`, the code of the step it was opened from) so each
   change shows here. Opened from the gear left of Next on every QR code step. */
function QrSettingsModal({ contrast, density, speed, onContrast, onDensity, onSpeed, onClose, children }) {
  const tune = (label, hint, v, set) => (
    <Stack align="center" gap="xxs" style={{ width: 150 }}>
      <Stepper label={label} value={v} min={1} max={5} onChange={set} />
      <Text variant="caption" align="center">{hint}</Text>
    </Stack>
  );
  return (
    <Modal title="QR Settings" width={560} onClose={onClose}>
      <Stack align="center" gap="l">
        {children}
        <Row gap="l" justify="center" align="flex-start">
          {tune('Contrast', 'Background brightness. Raise it if the device misreads the code.', contrast, onContrast)}
          {tune('Density', 'Data per frame. Lower it for older cameras; it adds parts.', density, onDensity)}
          {tune('Speed', 'Frames per second. Lower it if the device misses parts.', speed, onSpeed)}
        </Row>
      </Stack>
    </Modal>
  );
}

/* The tuning sits in a QR Settings overlay behind a gear left of Next, as Camera Settings
   does for a scan: the code keeps playing behind it. */
function QrDisplayStep({ context = 'sign', address, onNext, onCancel, initialRebuilding = false, initialSettings = false }) {
  const c = FLOW_COPY[context];
  const [contrast, setContrast] = React.useState(3);
  const [density, setDensity] = React.useState(3);
  const [speed, setSpeed] = React.useState(3);
  const [rebuilding, setRebuilding] = React.useState(initialRebuilding);
  const [showSettings, setShowSettings] = React.useState(!!initialSettings);
  const parts = React.useMemo(() => {
    const chunk = density * 24, n = Math.max(2, Math.ceil(QR_PAYLOAD.length / chunk));
    return Array.from({ length: n }, (_, i) => `UR:CRYPTO-PSBT/${i + 1}-${n}/${QR_PAYLOAD.slice(i * chunk, (i + 1) * chunk)}`);
  }, [density]);
  const [frame, setFrame] = React.useState(0);
  React.useEffect(() => {
    setFrame(0);
    const id = setInterval(() => setFrame(f => (f + 1) % parts.length), 520 - speed * 80);
    return () => clearInterval(id);
  }, [parts, speed]);
  const changeDensity = (v) => { setDensity(v); setRebuilding(true); setTimeout(() => setRebuilding(false), 700); };
  const svg = React.useMemo(() => qrSvg(parts[frame] || '', { ecOrder: ['L', 'M'] }), [parts, frame]);
  const bg = `hsl(220 14% ${40 + (contrast - 1) * 15}%)`;
  // The playing code with its part counter: on the step, and again in QR Settings.
  const code = (size) => (
    <Stack align="center" gap="m">
      <div style={{ position: 'relative' }}>
        <QRCard size={size} pad={16} radius={12} bg={bg} dim={rebuilding}>
          <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
        </QRCard>
        {rebuilding ? (
          <Stack align="center" justify="center" gap="s" style={{ position: 'absolute', inset: 0 }}>
            <Spinner size={28} /><Text variant="body" weight="demibold">Rebuilding the code…</Text>
          </Stack>
        ) : null}
      </div>
      <Text variant="mono" color="secondary" weight="demibold">{rebuilding ? 'Part – / –' : `Part ${frame + 1} / ${parts.length}`}</Text>
    </Stack>
  );
  return (
    <Stack align="center" gap="m">
      <Text variant="body" color="secondary" align="center">{c.qrHint}</Text>
      {context === 'verify' && address ? <Card tone="inset" pad="m" style={{ width: '100%' }}><ChunkedAddress text={address} wrap /></Card> : null}
      {code(400)}
      <ModalActions style={{ width: '100%' }} reason={rebuilding ? 'Wait for the code to rebuild.' : null}>
        <Btn id="qr_settings" onClick={() => setShowSettings(true)} />
        <Btn id="next_scan_the_answer" disabled={rebuilding} onClick={onNext} />
      </ModalActions>
      {showSettings ? (
        <QrSettingsModal contrast={contrast} density={density} speed={speed} onContrast={setContrast}
          onDensity={changeDensity} onSpeed={setSpeed} onClose={() => setShowSettings(false)}>
          {code(360)}
        </QrSettingsModal>
      ) : null}
    </Stack>
  );
}

const CAMERA_STATES = {
  starting: { icon: 'qr', title: 'Starting the camera…' },
  none: { icon: 'alert', title: 'No camera found', body: 'Connect a camera, then pick it in Camera Source.' },
  denied: { icon: 'lock', title: 'Camera unavailable', body: 'Silent has no permission to use the camera, or another app is using it. Allow access in the system settings.' },
  failed: { icon: 'circle_x', title: 'The camera failed to open', body: 'Pick another source in Camera Source.' },
};
const SCAN_ERRORS = {
  'wrong-request': { title: 'This code answers a different request', body: 'Scan the code the device showed for this request. If the device still shows an older one, start again on the device.' },
  'bare-sigs': { title: 'The device returned signatures only', body: 'Silent needs the whole signed transaction (PSBT). On the device, choose to export the signed PSBT, then scan again.' },
};

/* The 4:3 camera preview on its dark surface, the camera state drawn over it while
   there is no live picture. The scan step and Camera Settings each show one, fed by
   the same stream. */
function CameraView({ stream, status, contrast }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && stream) { ref.current.srcObject = stream; ref.current.play().catch(() => {}); }
  }, [stream, status]);
  const st = CAMERA_STATES[status];
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 'var(--radius-button)',
      overflow: 'hidden', background: 'var(--camera-bg)', border: '1px solid var(--border-light)' }}>
      <video ref={ref} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'live' ? 'block' : 'none',
        filter: `contrast(${(0.55 + contrast * 0.28).toFixed(2)})` }} />
      {st ? (
        <Stack align="center" justify="center" gap="s" style={{ position: 'absolute', inset: 0, padding: 'var(--space-l)', color: 'var(--gray-40)' }}>
          {status === 'starting' ? <Spinner size={40} /> : <Icon name={st.icon} size={40} />}
          <Text variant="section" align="center" color="inverse">{st.title}</Text>
          {st.body ? <Text variant="body" align="center" color="inverse-muted">{st.body}</Text> : null}
        </Stack>
      ) : null}
    </div>
  );
}

function CameraStep({ context = 'sign', force, progress, scanError, settings, onBack, onCancel, onDone }) {
  const c = FLOW_COPY[context];
  const streamRef = React.useRef(null);
  const [stream, setStream] = React.useState(null);
  const [cams, setCams] = React.useState([]);
  const [status, setStatus] = React.useState(force || 'starting');       // starting | live | none | denied | failed
  const [got, setGot] = React.useState(progress ? progress[0] : 0);
  const total = progress ? progress[1] : 6;
  const [err, setErr] = React.useState(scanError || null);
  const [showSettings, setShowSettings] = React.useState(!!settings);
  const [camIdx, setCamIdx] = React.useState(0);
  const [contrast, setContrast] = React.useState(3);
  const start = React.useCallback(async (id) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      if (!navigator.mediaDevices) throw new Error('none');
      const stream = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true, audio: false });
      streamRef.current = stream;
      setStream(stream);
      setStatus('live');
      const all = await navigator.mediaDevices.enumerateDevices();
      setCams(all.filter(d => d.kind === 'videoinput'));
    } catch (e) {
      setStatus(e && e.message === 'none' ? 'none' : id ? 'failed' : 'denied');
    }
  }, []);
  React.useEffect(() => {
    if (!force) start();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);
  React.useEffect(() => {   // demo: parts arrive while the preview is live
    if (status !== 'live' || err || force || progress) return;
    if (got >= total) { const t = setTimeout(() => onDone && onDone(), 600); return () => clearTimeout(t); }
    const t = setTimeout(() => setGot(g => g + 1), 650);
    return () => clearTimeout(t);
  }, [status, got, err]);
  const labels = cams.length ? cams.map((d, i) => d.label || `Camera ${i + 1}`) : ['Default Camera'];
  const e = err ? SCAN_ERRORS[err] : null;
  return (
    <Stack gap="m">
      <Text variant="body" color="secondary">{c.scanHint}</Text>
      <CameraView stream={stream} status={status} contrast={contrast} />
      {status === 'live' || progress ? <ScanProgress got={got} total={total} done={got >= total} /> : null}
      {e ? <Notice tone="error" title={e.title} action={<Btn id="scan_again" onClick={() => { setErr(null); setGot(0); }} />}>{e.body}</Notice> : null}
      <ModalActions onBack={onBack}>
        <Btn id="camera_settings" onClick={() => setShowSettings(true)} />
        {/* kit-only escape hatch: the preview usually has no camera, so let reviewers
           continue as if the scan succeeded. Not part of the app (not ported to Qt). */}
        {status !== 'live' || err ? <Btn id="kit_skip_scan" onClick={() => onDone && onDone()} /> : null}
      </ModalActions>
      {showSettings ? (
        /* settings overlay: the one allowed modal-on-modal (see Modal.jsx) — small,
           closes back to the live scan. It shows the stream too, so a camera or
           contrast change is seen while the scan step sits behind it. */
        <Modal title="Camera Settings" width={460} onClose={() => setShowSettings(false)}>
          <Stack gap="m">
            <CameraView stream={stream} status={status} contrast={contrast} />
            <FieldGroup>
              <Field label="Camera Source:">
                <ComboBox value={labels[camIdx] || labels[0]} options={labels} width={220}
                  onChange={l => { const n = labels.indexOf(l); setCamIdx(n); const d = cams[n]; if (d) start(d.deviceId); }} />
              </Field>
              <Field label="Contrast:"><Stepper value={contrast} min={1} max={5} onChange={setContrast} /></Field>
            </FieldGroup>
          </Stack>
        </Modal>
      ) : null}
    </Stack>
  );
}

/* A hot key: the flow waits under a spinner while the generic unseal modal, opened over
   it, takes the password and works. Closing the prompt goes back to the picker. */
function HotStep({ context = 'sign', keyAlias, onCancel, onDone, initialBusy = false, pwError }) {
  const c = FLOW_COPY[context];
  return (
    <>
      <ModalStatus spinner title={c.hotBusy} subtitle={`With “${keyAlias}”.`} pad="var(--space-m) 0" />
      <UnsealModal title={c.title} prompt={c.hotPrompt(keyAlias)} proceedId={c.hotBtn} error={pwError}
        busyTitle={c.hotBusy} busySubtitle={`With “${keyAlias}”.`} initialBusy={initialBusy}
        onCancel={onCancel} onDone={onDone} />
    </>
  );
}

/* ---------------- 3.10 Verify result ---------------- */

const VERIFY_RESULT = {
  matched: { icon: 'circle_check', color: 'var(--success)', title: 'Address Confirmed', body: d => `${d} derived the same address. It belongs to this wallet.` },
  mismatch: { icon: 'alert', color: 'var(--error)', title: 'Address Does Not Match', body: d => `${d} did not confirm this address. Do not use it to receive coins.` },
  error: { icon: 'circle_x', color: 'var(--text-muted)', title: 'Could Not Verify', body: d => `${d} did not return an answer. The address was not checked.` },
};

function VerifyResult({ result = 'matched', device, address, onClose, onRetry }) {
  const r = VERIFY_RESULT[result];
  return (
    <Stack gap="m">
      <ModalStatus icon={r.icon} iconColor={r.color} title={r.title} subtitle={r.body(device)} pad="var(--space-s) 0 0" />
      {address ? <Card tone="inset" pad="m"><ChunkedAddress text={address} /></Card> : null}
      {result !== 'matched' && onRetry ? (
        <ModalActions><Btn id="try_again" onClick={onRetry} /></ModalActions>
      ) : null}
    </Stack>
  );
}

/* ---------------- Controller: one modal for the whole flow ---------------- */

function SigningFlow({ context = 'sign', plan = [], others = [], address, fileBase, keyRow, onDone, onCancel, initial = {} }) {
  const c = FLOW_COPY[context];
  const [rows, setRows] = React.useState(plan);
  const [step, setStep] = React.useState(initial.step || (keyRow ? { row: keyRow } : null));   // null = picker | { row, result? }
  const [usbErr, setUsbErr] = React.useState(initial.usbError || null);
  const [qrPhase, setQrPhase] = React.useState(initial.qrPhase || 'display');

  const row = step && step.row;
  const devLabel = row ? (row.device || row.alias || 'the device') : '';
  const pick = (r) => { setUsbErr(null); setQrPhase('display'); setStep({ row: r }); };
  const back = keyRow ? null : () => setStep(null);
  const finished = (r) => {
    if (context === 'verify') return setStep({ row: r, result: 'matched' });
    if (context === 'fetch' || context === 'fetch-xpub') return onDone && onDone(r);
    const next = rows.map(x => (x.fp === r.fp ? { ...x, status: 'signed' } : x.status === 'waiting' && r.status === 'first' ? { ...x, status: 'ready' } : x));
    setRows(next); setStep(null);
    if (!next.some(x => ['first', 'ready', 'waiting'].includes(x.status))) onDone && onDone();
  };
  React.useEffect(() => {   // demo: a USB device answers after a moment
    if (!row || row.route !== 'usb' || usbErr || step.result || initial.step) return;
    const t = setTimeout(() => finished(row), 1800);
    return () => clearTimeout(t);
  }, [step, usbErr]);

  let title = c.title, width = 560, body;
  if (!step) body = <SignerPicker context={context} plan={rows} others={others} onPick={pick} onCancel={onCancel} />;
  else if (step.result) { width = 520; body = <VerifyResult result={step.result} device={devLabel} address={address} onClose={onCancel} onRetry={() => pick(row)} />; }
  else if (row.route === 'usb') { title = c.usbTitle; width = 520; body = <UsbStep context={context} device={devLabel} error={usbErr} onCancel={onCancel} onRetry={() => setUsbErr(null)} onBack={back} />; }
  else if (row.route === 'sd') { title = c.sdTitle; body = <SdStep context={context} fileBase={fileBase} phase={initial.sdPhase} error={initial.sdError} onCancel={onCancel} onDone={() => finished(row)} />; }
  else if (row.route === 'hot') { width = 520; body = <HotStep context={context} keyAlias={row.alias} pwError={initial.pwError} initialBusy={initial.hotBusy} onCancel={onCancel} onDone={() => finished(row)} />; }
  else if (qrPhase === 'display') { title = c.qrTitle; width = 640; body = <QrDisplayStep context={context} address={address} initialRebuilding={initial.rebuilding} initialSettings={initial.qrSettings} onCancel={onCancel} onNext={() => setQrPhase('scan')} />; }
  else { title = c.scanTitle; width = 640; body = <CameraStep context={context} force={initial.camera} progress={initial.progress} scanError={initial.scanError} settings={initial.settings} onBack={() => setQrPhase('display')} onCancel={onCancel} onDone={() => finished(row)} />; }

  return <Modal title={title} width={width} onClose={onCancel}>{body}</Modal>;
}

Object.assign(window, { FLOW_COPY, SIGNER_STATUS, SignerPicker, UsbStep, SdStep, QrSettingsModal, QrDisplayStep, CameraStep, HotStep,
  VerifyResult, SigningFlow, CAMERA_STATES, SCAN_ERRORS, USB_ERRORS, VERIFY_RESULT });
