/* Silent UI Kit: Send screen (Send.cpp + broadcast and sent modals). Signing runs
   through SigningFlow (Signing.jsx): picker → route steps, in one modal.
   Two-pane layout: payments + coin selection on the left, a persistent
   transaction summary / send rail on the right (with a tx-shape diagram). */

function looksLikeAddress(s) { return /^(sp1|bc1|tb1|bcrt1)[a-z0-9]{6,}$/i.test(s.trim()); }
function looksLikeAmount(s) { const v = parseFloat(s); return !isNaN(v) && v > 0; }

const btcToFiat = (btc, price) => price.rate !== null && looksLikeAmount(btc) ? (parseFloat(btc) * price.rate).toFixed(2) : '';
const fiatToBtc = (fiat, price) => price.rate !== null && looksLikeAmount(fiat) ? (parseFloat(fiat) / price.rate).toFixed(8) : '';
const formatFiat = (btc, price) => {
  const amount = btcToFiat(btc, price);
  return amount ? `~ ${amount} ${price.currency}` : '';
};

function RecipientCard({ out, idx, deletable, canMax, maxAmount, onChange, onDelete, onScan }) {
  const { price } = React.useContext(PriceFeedContext);
  const [fiatEdit, setFiatEdit] = React.useState(null);
  React.useEffect(() => setFiatEdit(null), [price.currency, price.rate]);
  /* Keep an explicit fiat edit's text until BTC or the selected quote changes. */
  const edited = fiatEdit && fiatEdit.btc === out.amount && fiatEdit.currency === price.currency && fiatEdit.rate === price.rate;
  const fiatValue = out.max ? btcToFiat(maxAmount, price) : edited ? fiatEdit.text : btcToFiat(out.amount, price);
  const editFiat = e => {
    const text = e.target.value;
    if (!/^\d*(\.\d{0,2})?$/.test(text)) return;
    const btc = fiatToBtc(text, price);
    setFiatEdit({ text, btc, currency: price.currency, rate: price.rate });
    onChange({ ...out, amount: btc });
  };
  const addrState = out.address === '' ? 'none' : looksLikeAddress(out.address) ? 'valid' : 'invalid';
  const amtState = out.max ? 'none' : out.amount === '' ? 'none' : looksLikeAmount(out.amount) ? 'valid' : 'invalid';
  return (
    <Card corner={deletable ? (
      <Btn id="remove_payment" onClick={onDelete} />
    ) : null}>

      <PaymentRow label="Address">
        {/* The scan button takes its width from the address: the row ends where the
            description below does. */}
        <Row gap="xs">
          <Btn id="scan_address" onClick={onScan} style={{ flex: 'none' }} />
          <ValidatedInput mono state={addrState} placeholder="sp1q… / bc1q…" wrapStyle={{ flex: 1, minWidth: 0 }}
            value={out.address} onChange={e => onChange({ ...out, address: e.target.value })} />
        </Row>
      </PaymentRow>

      <PaymentRow label="Description">
        <ValidatedInput state="none" placeholder="Payment label"
          value={out.label} onChange={e => onChange({ ...out, label: e.target.value })} />
      </PaymentRow>

      <PaymentRow label="Amount (BTC)">
        <Row gap="m">
          <ValidatedInput mono state={amtState} placeholder="0.001 (in BTC)" disabled={out.max}
            value={out.max ? 'MAX' : out.amount} wrapStyle={{ flex: 1, minWidth: 0 }}
            onChange={e => onChange({ ...out, amount: e.target.value })} />
          {price.rate !== null ? <Row gap="xs" grow style={{ minWidth: 0 }}>
            <Input mono grow placeholder="0.00" inputMode="decimal" disabled={out.max} value={fiatValue} onChange={editFiat} />
            <Text variant="body" weight="demibold" color="secondary">{price.currency}</Text>
          </Row> : null}
          {canMax ? (
            <Row style={{ flex: 'none' }}>
              <Checkbox checked={out.max} onChange={v => onChange({ ...out, max: v })} label="MAX" />
            </Row>
          ) : null}
        </Row>
      </PaymentRow>
    </Card>
  );
}

/* The core Send panel (account/views/Send.cpp) of every account: payments, coins
   selection, the transaction, then the account's signing step (SendSigning). An sp
   account signs then broadcasts (sp/SpSigning.cpp); a Multikey Wallet picks its spend
   path, signs (Sign starts the session), then runs the MuSig2 rounds on the signing card
   (musig/SigningSection.cpp). While the step holds a transaction, the payments and the
   coins are locked and the fee inputs and Clear are hidden. `initial.round` opens a
   Multikey Send prepared, at that round (1 | 2 | 'ready'), with `initial.payments`. */
function SendScreen({ wallet, initial = {}, onProgress }) {
  const { price } = React.useContext(PriceFeedContext);
  const { preferences, rate } = React.useContext(FeeFeedContext);
  const blankOutput = () => ({ address: '', amount: '', label: '', max: false });
  const musig = wallet.kind === 'musig';
  const keyPath = musig ? `Key path: ${wallet.cosigners.split(', ').join(' + ')}` : null;
  const [outputs, setOutputs] = React.useState(initial.payments || [blankOutput()]);
  const [feeRate, setFeeRate] = React.useState(!initial.inputs);
  const [fee, setFee] = React.useState(initial.fee || '1');
  const [feeMode, setFeeMode] = React.useState(initial.inputs ? 'Manual' : preferences.mode);
  const [feeTier, setFeeTier] = React.useState('Medium');
  const [auto, setAuto] = React.useState(!initial.inputs);
  const [selected, setSelected] = React.useState(initial.inputs ? Object.fromEntries(initial.inputs.map((_, i) => [i, true])) : {});
  const [modal, setModal] = React.useState(null); // null | 'confirm' | 'sending' | 'sent'
  const [signed, setSigned] = React.useState(false);
  const [path, setPath] = React.useState(initial.path || keyPath); // the Multikey spend path
  const [round, setRound] = React.useState(initial.round || null); // null | 1 | 2 | 'ready'
  const [progress, setProgress] = React.useState(initial);
  const [restored, setRestored] = React.useState(!!initial.inputs);
  const coins = restored ? initial.inputs : wallet.coins;
  const updateProgress = patch => {
    setProgress(p => ({ ...p, ...patch }));
    onProgress && onProgress(patch);
  };
  const updateRound = r => { setRound(r); updateProgress({ round: r, ...(r === 'ready' ? { finalized: true } : {}) }); };

  React.useEffect(() => {
    setOutputs(initial.payments || [blankOutput()]); setModal(null); setSigned(false);
    setPath(initial.path || keyPath); setRound(initial.round || null);
  }, [wallet]);

  // The signing step holds a transaction: signed (sp) or prepared (Multikey).
  const held = musig ? round !== null : signed || modal === 'signer';
  const recommendation = rate(feeMode, feeTier);
  // Fallback and explicit overrides stay Manual until the user opts in again.
  React.useEffect(() => {
    if (held || restored || feeMode === 'Manual') return;
    if (recommendation === null) setFeeMode('Manual');
    setFee(String(recommendation === null ? 1 : recommendation));
  }, [held, restored, feeMode, recommendation]);

  const initializeFees = () => {
    const value = rate(preferences.mode, 'Medium');
    setFeeMode(value === null ? 'Manual' : preferences.mode);
    setFeeTier('Medium'); setFeeRate(true); setFee(String(value === null ? 1 : value));
  };
  const pickFeeMode = mode => { setFeeMode(mode); if (mode !== 'Manual') setFeeRate(true); };
  const editFee = e => {
    const value = e.target.value;
    if (!(feeRate ? /^\d*(\.\d{0,3})?$/ : /^\d*$/).test(value)) return;
    setFeeMode('Manual'); setFee(value);
  };
  const clearAll = () => { clearOutputs(); setSelected({}); setSigned(false); setRound(null); setRestored(false); setProgress({}); };

  const anyMax = outputs.some(o => o.max);
  const setOut = (i, v) => setOutputs(outputs.map((o, k) => k === i ? v : o));
  const addOutput = () => setOutputs([...outputs, blankOutput()]);
  const delOutput = (i) => setOutputs(outputs.filter((_, k) => k !== i));
  const clearOutputs = () => setOutputs([blankOutput()]);

  const validFee = looksLikeAmount(fee) && (feeRate || /^\d+$/.test(fee));
  const valid = outputs.every(o => looksLikeAddress(o.address) && (o.max || looksLikeAmount(o.amount))) && validFee;
  const selCount = Object.values(selected).filter(Boolean).length;

  // Auto coin selection — mock the Rust simulation: greedily cover the
  // recipients' total (largest coins first), or take everything if a MAX output exists.
  const btcOf = s => parseFloat(String(s).split(' ')[0]) || 0;
  const reqTotal = outputs.reduce((s, o) => s + (!o.max && looksLikeAmount(o.amount) ? parseFloat(o.amount) : 0), 0);
  const autoSel = (() => {
    const sorted = [...coins].map(c => btcOf(c.value)).sort((a, b) => b - a);
    let amount = 0, count = 0;
    for (const v of sorted) {
      if (!anyMax && amount >= reqTotal) break;
      amount += v; count++;
    }
    return { amount, count };
  })();

  const recipients = outputs.map(o => `${o.address.slice(0, 12)}…  ${o.max ? 'MAX' : o.amount + ' BTC'}`);

  // Indices auto-selection picks (largest first), so an unfolded list can show them.
  const autoIdxSet = (() => {
    const order = coins.map((c, i) => [i, btcOf(c.value)]).sort((a, b) => b[1] - a[1]);
    const set = new Set();
    let amount = 0;
    for (const [i, v] of order) { if (!anyMax && amount >= reqTotal) break; amount += v; set.add(i); }
    return set;
  })();

  // Layout is delegated to DashboardLayout: Send hands it two columns and it
  // decides single vs side-by-side. The column builders below are functions of
  // that decision ({ sideBySide }) so their inner content can adapt.

  // --- transaction math (mock) ---
  const selCoins = auto
    ? [...coins].sort((a, b) => btcOf(b.value) - btcOf(a.value)).slice(0, autoSel.count)
    : coins.filter((_, i) => selected[i]);
  const inSum = selCoins.reduce((a, c) => a + btcOf(c.value), 0);
  const feeNum = looksLikeAmount(fee) ? parseFloat(fee) : 0;
  const feeBtc = (feeRate ? feeNum * 200 : feeNum) / 1e8; // mock ~200 vB tx
  const sendBtc = anyMax ? Math.max(0, inSum - feeBtc) : reqTotal;
  const totalBtc = sendBtc + feeBtc;
  /* summary value: fiat to the left of the BTC amount, every row */
  const fmt8 = n => <Row inline gap="s"><Text variant="mono" color="muted">{formatFiat(n, price)}</Text><BtcText btc={n} fixed /></Row>;

  // diagram data
  const inItems = selCoins.map((c, i) => ({
    w: btcOf(c.value), title: `Input #${i + 1}`,
    fiat: formatFiat(btcOf(c.value), price), addr: c.outpoint,
  }));
  const recipItems = outputs.map((o, i) => {
    const v = o.max ? sendBtc : (parseFloat(o.amount) || 0);
    return { w: v, kind: 'recipient', title: o.label ? o.label : `Output #${i + 1}`, label: o.label,
      fiat: formatFiat(v, price), addr: o.address || 'recipient address…' };
  }).filter(d => d.w > 0);
  const changeV = anyMax ? 0 : Math.max(0, inSum - reqTotal - feeBtc);
  const outItems = [
    ...recipItems,
    ...(changeV > 1e-9 ? [{ w: changeV, kind: 'change', title: 'Change', fiat: formatFiat(changeV, price), addr: '(returned to your wallet)' }] : []),
    ...(feeBtc > 0 && inSum > 0 ? [{ w: feeBtc, kind: 'fee', title: 'Network fee', fiat: formatFiat(feeBtc, price), addr: '(paid to miners)' }] : []),
  ];

  const coinsHeader = (
    <Row gap="s" style={{ marginBottom: 'var(--space-s)', minHeight: 34 }}>
      <SectionLabel>{auto ? 'Coins selection' : selCount > 0 ? `Coins · ${selCount} selected` : 'Coins selection'}</SectionLabel>
      <Spacer />
      {!auto ? <Btn id="clear" onClick={() => setSelected({})} /> : null}
      <Checkbox checked={auto} onChange={setAuto} label="Auto coin selection" />
    </Row>
  );

  // Fold to a one-line summary only when stacked + auto; otherwise show the full list.
  const coinsBodyFor = (sideBySide) => (auto && !sideBySide) ? (
    <Card tone="inset" pad="m">
      <Row align="baseline" gap="s">
      <Amount value={autoSel.amount.toFixed(8)} size="lg" unit="BTC" fixed
        count={`(${autoSel.count} coin${autoSel.count === 1 ? '' : 's'})`} />
          </Row>
    </Card>
  ) : (
    <CoinTable coins={coins} readOnly={auto || held}
      isChecked={(c, i) => auto ? autoIdxSet.has(i) : !!selected[i]}
      onToggle={(i, v) => setSelected({ ...selected, [i]: v })} />
  );

  const renderPrimary = ({ sideBySide }) => (
    <div inert={held ? '' : undefined}
      style={{ opacity: held ? 0.55 : 1, transition: 'opacity 0.15s', position: 'relative' }}>
      {/* Coins selection — always on top */}
      {coinsHeader}
      {coinsBodyFor(sideBySide)}

      {/* Multikey: the spend path the picked coins allow, part of composing the send */}
      {musig ? (
        <div style={{ marginTop: 'var(--space-m)' }}>
          <SpendPathPicker leaves={[restored ? initial.path : keyPath]} value={path} locked={held} onChange={setPath} width="100%" />
        </div>
      ) : null}

      <Divider space="0" style={{ margin: 'var(--space-l) 0 var(--space-m)' }} />

      {/* Payments */}
      <SectionHeader label="Payments" />
      <Stack gap="s">
        {outputs.map((o, i) => (
          <RecipientCard key={i} out={o} idx={i} deletable={outputs.length > 1}
            canMax={!anyMax || o.max} maxAmount={Math.max(0, sendBtc - reqTotal)} onChange={v => setOut(i, v)} onDelete={() => delOutput(i)}
            onScan={() => setModal({ type: 'scan', idx: i })} />
        ))}
      </Stack>
      <Row justify="flex-end" style={{ marginTop: 'var(--space-s)' }}>
        <Btn id="add_payment" onClick={addOutput} />
      </Row>
    </div>
  );

  const txDiagram = <TxFlowCard inputs={inItems} outputs={outItems} />;

  // A Multikey fee depends on its spend path: no estimate before one is picked.
  const estimated = !musig || !!path;
  const summaryRows = (
    <TransactionSummary
      rows={[
        { label: 'Sending', value: fmt8(sendBtc) },
        { label: 'Network fee', value: estimated ? fmt8(feeBtc) : '--' },
        changeV > 1e-9 && estimated ? { label: 'Change', value: fmt8(changeV) } : null,
      ]}
      total={{ label: 'Total', value: estimated ? fmt8(totalBtc) : '--' }} />
  );

  // Why a Multikey Sign is disabled, shown with the Transaction actions (the spend path picker sits under Coins).
  const prepareReason = !selCoins.length ? 'No coin to spend yet'
    : !path ? 'Pick a spend path'
    : !valid ? 'Transaction is not valid' : null;
    /* Multikey: only the reason Sign is disabled; the rounds run in the Sign modal */
  const musigStep = musig && !held && prepareReason ? <Text variant="caption">{prepareReason}</Text> : null;

  const actionRow = (
    <Row align="flex-end" gap="s">
      {held ? null : (
      <React.Fragment>
      <ComboBox value={feeMode} options={['Manual', 'Default', 'Smart']} width={120} onChange={pickFeeMode} />
      {feeMode === 'Smart' ? <ComboBox value={feeTier} options={['Low', 'Medium', 'Fast']} width={120} onChange={setFeeTier} /> : null}
      <div style={{ flex: 'none' }}>
        <FieldLabel>Fee rate</FieldLabel>
        <Row gap="s">
          <Toggle on={feeRate} onClick={() => { setFeeMode('Manual'); setFeeRate(r => !r); }} />
          <ValidatedInput mono aria-label="Fee value" inputMode={feeRate ? 'decimal' : 'numeric'} state={validFee ? 'valid' : 'invalid'}
            value={fee} onChange={editFee}
            wrapStyle={{ flex: 'none', width: 104 }} />
          <Text variant="body" color="secondary" style={{ flex: 'none' }}>{feeRate ? 'sats/vB' : 'sats'}</Text>
        </Row>
      </div>
      </React.Fragment>
      )}
      <Spacer />
      {musig ? (
        /* The Multikey step's button: Sign (starts the MuSig2 rounds), disabled while it holds the transaction. */
        <Row gap="s" style={{ flex: 'none' }}>
          {/* while a session runs: Cancel drops it, Sign reopens the Sign modal at its round */}
          {held ? <Btn id="cancel_signed" onClick={() => { setRound(null); setRestored(false); setSelected({}); setProgress({}); }} /> : <Btn id="clear" onClick={clearAll} />}
          <Btn id="sign" disabled={!held && !!prepareReason} onClick={() => { if (!held) setRound(1); setModal({ type: 'musig' }); }} style={{ flex: 'none' }} />
        </Row>
      ) : (
      <Row gap="s" style={{ flex: 'none' }}>
        {signed ? (
          <Pill id="tx_signed" />
        ) : null}
        {signed ? <Btn id="cancel_signed" onClick={() => setSigned(false)} /> : <Btn id="clear" onClick={clearAll} />}
        {signed ? (
          <Btn id="broadcast" onClick={() => setModal({ type: 'broadcast' })} style={{ flex: 'none' }} />
        ) : (
          <Btn id="sign" disabled={!valid} onClick={() => setModal('signer')} style={{ flex: 'none' }} />
        )}
      </Row>
      )}
    </Row>
  );

  const renderSecondary = ({ sideBySide }) => (
    <React.Fragment>
      {musig && initial.saveWarning ? <Text variant="caption">{psbtSaveWarning(initial.saveWarning)}</Text> : null}
      {/* heading: same style + row height as the Coins selection heading, so they align */}
      <Row style={{ minHeight: 34, marginBottom: 'var(--space-s)' }}>
        <SectionLabel>Transaction</SectionLabel>
      </Row>
      {sideBySide ? (
        /* side-by-side: diagram on top, gap, then summary + buttons grouped at the bottom */
        <React.Fragment>
          {txDiagram}
          <div style={{ flex: '1 0 100px' }} />
          {summaryRows}
          <div style={{ marginTop: 'var(--space-m)' }}>{actionRow}</div>
          {musigStep ? <div style={{ marginTop: 'var(--space-m)' }}>{musigStep}</div> : null}
        </React.Fragment>
      ) : (
        /* single column: summary, then buttons, then the diagram last */
        <Stack gap="m">
          {summaryRows}
          {actionRow}
          {musigStep}
          {txDiagram}
        </Stack>
      )}
    </React.Fragment>
  );

  return (
    <React.Fragment>
      {restored && initial.warning ? <Text variant="body">{initial.warning}</Text> : null}
      <DashboardLayout title="Send" primary={renderPrimary} secondary={renderSecondary} />
      {modal === 'signer' ? (
        <SigningFlow context="sign" plan={window.SIGNING_PLAN} others={window.OTHER_DEVICES} fileBase={wallet.name}
          onCancel={() => setModal(null)} onDone={() => { setSigned(true); setModal(null); }} />
      ) : null}
      {modal && modal.type === 'scan' ? (
        /* The bare text read goes into the address input, which checks it. */
        <Modal title="Scan Address" width={600} onClose={() => setModal(null)}>
          <CameraStep context="scan-address" onBack={() => setModal(null)} onCancel={() => setModal(null)}
            onDone={() => { setOut(modal.idx, { ...outputs[modal.idx], address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }); setModal(null); }} />
        </Modal>
      ) : null}
      {modal && modal.type === 'broadcast' ? (
        <BroadcastModal onDone={() => setModal({ type: 'sent' })} onClose={() => { clearAll(); setModal(null); }} />
      ) : null}
      {modal && modal.type === 'musig' ? (
        <MusigSignModal signers={musigSigners(wallet.cosigners.split(', '))} round={round}
          initial={progress} txid={progress.txid || MUSIG_TXID} lost={progress.lost} finalized={progress.finalized}
          saveWarning={initial.saveWarning} onProgress={updateProgress}
          onRound={updateRound} onClose={() => setModal(null)}
          onBroadcast={() => { updateProgress({ broadcast: true, finalized: true }); setModal({ type: 'sent', txid: MUSIG_TXID }); }} />
      ) : null}
      {modal && modal.type === 'sent' ? (
        <SentModal txid={modal.txid} onClose={() => { clearAll(); initializeFees(); setModal(null); }} />
      ) : null}
    </React.Fragment>
  );
}

/* The broadcast spinner; once the server takes the transaction, `onDone` opens SentModal. */
function BroadcastModal({ onDone, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <Modal title="Broadcast" width={460} onClose={onClose}>
      <ModalStatus spinner title="Broadcasting transaction…" pad="var(--space-xl) 0 var(--space-l)" />
    </Modal>
  );
}

const SENT_TXID = '501895f3cc36d5e35514b5ff7af55c9b0822e114560ebe6fdab238067db076e2';

/* SentModal: the broadcast succeeded (Qt: MessageModal, Tone::Success). The status
   only, no txid. No action bar: the header × closes it. Both Send screens end here. */
function SentModal({ onClose }) {
  return (
    <Modal title="Transaction Sent" width={460} onClose={onClose}>
      <ModalStatus icon="circle_check" iconColor="var(--success)" title="The transaction was broadcast." pad="var(--space-l) 0" />
    </Modal>
  );
}

Object.assign(window, { SendScreen, BroadcastModal, SentModal, SENT_TXID,
  RecipientCard,
  looksLikeAmount, looksLikeAddress, btcToFiat, fiatToBtc, formatFiat });
