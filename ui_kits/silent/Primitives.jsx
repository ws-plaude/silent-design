/* Silent UI Kit — Primitives. Mirrors src/theme/*.cpp roles via components.css classes. */

/* Measure a container's width so layouts can react to real available space.
   ResizeObserver is unreliable in some embedded preview frames, so we poll the
   measured width on a rAF loop. Shared by the dashboard layout and Send. */
function useMeasure() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const tick = () => {
      if (ref.current) {
        // offsetWidth is the layout width: unaffected by a CSS transform (the kit's scaled-to-fit wide preview)
        const next = ref.current.offsetWidth;
        setW(prev => Math.abs(prev - next) > 0.5 ? next : prev);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return [ref, w];
}

export function Button({ role = 'default', children, className = '', icon, iconSize = 20, iconTone, ...rest }) {
  const cls = {
    default: 's-btn',
    primary: 's-btn s-btn--primary',
    destructive: 's-btn s-btn--destructive',
    inline: 's-btn s-btn--inline',
    menu: 's-btn--menu',
    icon: 's-btn s-btn--icon',
    'inline-icon': 's-btn s-btn--inline-icon',
    'tab-open': 's-btn s-btn--tab-open',
    'tab-create': 's-btn s-btn--tab-create',
    index: 's-btn s-btn--index',
  }[role] || 's-btn';
  const dom = { ...rest };
  ['role', 'className', 'icon', 'iconSize', 'iconTone', 'children'].forEach(k => delete dom[k]);
  return (
    <button className={`${cls} ${className}`.trim()} {...dom}>
      {icon ? <Icon name={icon} size={iconSize} tone={iconTone} /> : null}
      {children}
    </button>
  );
}

/* `grow` fills the free space of its Row / Field (flex 1) instead of a fixed width. */
export function Input({ mono = false, width, grow = false, className = '', ...rest }) {
  // border-box so width="100%" includes padding + border and never overflows its container
  const style = grow ? { flex: 1, minWidth: 0, boxSizing: 'border-box' } : width ? { width, boxSizing: 'border-box' } : {};
  const dom = { ...rest }; delete dom.mono; delete dom.width; delete dom.grow;   // defensive: preview instrumentation can leave these in rest
  return <input className={`s-input ${mono ? 's-input--mono' : ''} ${className}`} style={style} {...dom} />;
}

/* DateTimeInput — a date and time with a calendar popup; `min` / `value` are
   'YYYY-MM-DDTHH:MM'. Qt: QDateTimeEdit with setCalendarPopup(true). */
export function DateTimeInput({ value, min, onChange, width = 220, disabled }) {
  return <input type="datetime-local" className="s-input s-input--datetime" value={value || ''} min={min}
    disabled={disabled} onChange={e => onChange && onChange(e.target.value)} style={{ width, boxSizing: 'border-box' }} />;
}

/* TextArea — multiline input (Qt theme::TextEdit). */
export function TextArea({ mono = false, width, height = 50, className = '', style, ...rest }) {
  const dom = { ...rest }; delete dom.mono; delete dom.width; delete dom.height;
  return <textarea className={`s-input ${mono ? 's-input--mono' : ''} ${className}`}
    style={{ width, height, resize: 'none', boxSizing: 'border-box', ...style }} {...dom} />;
}

export function Display({ value, variant = 'default', width, className = '' }) {
  const v = variant === 'mono' ? 's-display--mono' : variant === 'amount' ? 's-display--amount' : '';
  const style = width ? { width } : {};
  return <span className={`s-display ${v} ${className}`} style={style}>{value}</span>;
}

/* Field — label + control on one row. The label is sized to its text: no gap
   beyond the row gap. Inside a <FieldGroup> the labels share ONE column, as wide
   as the group's longest label — just enough to line the inputs up, never more.
   `labelWidth` forces a width (legacy screens). Qt: QFormLayout. */
const FieldGroupCtx = React.createContext(false);
export function FieldGroup({ children, gap = 'xs' }) {
  return (
    <FieldGroupCtx.Provider value={true}>
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', columnGap: 'var(--space-xs)',
        rowGap: spaceVal(gap), alignItems: 'center' }}>{children}</div>
    </FieldGroupCtx.Provider>
  );
}
export function Field({ label, labelWidth, children, align = 'center' }) {
  const inGroup = React.useContext(FieldGroupCtx);
  const lbl = <span className="t-info-label" style={{ width: labelWidth || 'auto', flex: 'none', color: 'var(--text)', alignSelf: align === 'flex-start' ? 'start' : undefined }}>{label}</span>;
  if (inGroup) return (
    <React.Fragment>
      {lbl}
      <div style={{ display: 'flex', alignItems: align, gap: 'var(--space-xs)', minWidth: 0 }}>{children}</div>
    </React.Fragment>
  );
  return (
    <div style={{ display: 'flex', alignItems: align, gap: 'var(--space-xs)', padding: '3px 0' }}>
      {lbl}
      {children}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled }) {
  return (
    <span className={`s-check ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''}`}
      style={disabled ? { opacity: 0.55, cursor: 'default' } : undefined}
      onClick={() => { if (!disabled && onChange) onChange(!checked); }}>
      <span className="box" />
      {label ? <span style={{ fontSize: 'var(--size-caption)' }}>{label}</span> : null}
    </span>
  );
}

/* disabled: dimmed, not clickable (e.g. a plugin while it unloads). */
export function Toggle({ on, status = false, disabled = false, onClick }) {
  return <span className={`s-toggle ${status ? 's-toggle--status' : ''} ${on ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}
    role="switch" aria-checked={!!on} aria-disabled={disabled || undefined} onClick={disabled ? undefined : onClick} />;
}

/* Indeterminate spinner — reused by every "working…" modal (signing, broadcasting). */
export function Spinner({ size = 114 }) {
  return (
    <span className="s-spin" style={{ display: 'inline-flex', color: 'var(--accent)' }}>
      <Icon name="refresh" size={size} />
    </span>
  );
}

/* Card — the panel/surface recipe. tone 'surface' (default) | 'inset'.
   pad: l (default) | m | s | none. `corner` holds a pinned top-left action (e.g. remove). */
export function Card({ tone = 'surface', pad = 'l', corner, className = '', style, children, ...rest }) {
  return (
    <div className={`s-card ${tone === 'inset' ? 's-card--inset' : ''} ${pad !== 'l' ? 's-card--pad-' + pad : ''} ${className}`} style={style} {...rest}>
      {corner ? <span className="s-card__corner">{corner}</span> : null}
      {children}
    </div>
  );
}

/* Badge — small status pill. tone: success | warning | error | neutral | off (unavailable, e.g. Offline). */
/* `width` picks a PillWidth (M | L); omitted = content-sized. Label centred. */
export function Badge({ tone = 'neutral', icon, iconSize = 14, width, children, style }) {
  const wc = width && width !== 'Auto' ? ' s-badge--w-' + width.toLowerCase() : '';
  return (
    <span className={`s-badge s-badge--${tone}${wc}`} style={style}>
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
    </span>
  );
}

/* SelectRow — full-width pick-list row (icon · title/sub · status · meta · trailing · chevron).
   States: default (clickable), `selected` (the current pick), `disabled` (cannot be
   picked — put the reason in `sub`), static (no onClick: informational, no hover),
   `current` (the active step of a step list: highlighted, not a choice — no check).
   tone="error": the row is in a failed state (e.g. a plugin that failed to load) —
   error-tinted, error icon; the reason goes in `sub`.
   Lists: pass metaWidth / statusWidth / trailingWidth so every row's columns line up
   (slots keep their width when empty; the chevron sits in the trailing slot).
   `trailing` holds an action (e.g. a labelled Button); its clicks don't open the row.
   Rendered as a div[role=button] so a trailing Button is valid markup.
   `twoLine`: a title-only row keeps the height of a title + sub row.
   `tone` 'add': the list's closing "add one" row — icon and title centred, no chevron.
   Qt: a QFrame row with an HBox; selected/disabled are QSS dynamic properties. */
export function SelectRow({ twoLine, icon, iconSize = 18, title, sub, meta, note, status, trailing, onClick, chevron, selected, current, disabled, tone, metaWidth, statusWidth, trailingWidth, style }) {
  const clickable = !!onClick && !disabled;
  const add = tone === 'add';
  const showChev = add ? false : chevron != null ? chevron : clickable && !trailing && selected == null;
  const cls = 's-select-row' + (tone === 'error' ? ' s-select-row--error' : '') + (add ? ' s-select-row--add' : '') + (twoLine ? ' s-select-row--two-line' : '') + (selected || current ? ' is-selected' : '') + (disabled ? ' is-disabled' : '') + (!onClick && !disabled && !selected && !current ? ' is-static' : '');
  return (
    <div className={cls} style={style} role={onClick ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined} aria-disabled={disabled || undefined} aria-pressed={selected != null ? !!selected : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }) : undefined}>
      {icon ? <span className="s-select-row__icon"><Icon name={icon} size={iconSize} /></span> : null}
      {twoLine && !sub ? (
        /* a hidden title + sub ghost sets the height; the real title centres over it */
        <span className="s-select-row__body s-select-row__body--ghosted">
          <span className="s-select-row__ghost" aria-hidden="true">
            <span className="s-select-row__title">&nbsp;</span><span className="s-select-row__sub">&nbsp;</span>
          </span>
          <span className="s-select-row__title">{title}</span>
        </span>
      ) : (
        <span className="s-select-row__body">
          <span className="s-select-row__title">{title}</span>
          {sub ? <span className="s-select-row__sub">{sub}</span> : null}
        </span>
      )}
      {meta || metaWidth ? <span className="s-select-row__meta" style={metaWidth ? { width: metaWidth } : undefined}>{meta}</span> : null}
      {/* a short sentence just left of the status: why a row is greyed out */}
      {note ? <span className="s-select-row__note">{note}</span> : null}
      {status || statusWidth ? <span style={{ flex: 'none', display: 'inline-flex', width: statusWidth }}>{status}</span> : null}
      {trailingWidth ? (
        <span style={{ flex: 'none', width: trailingWidth, display: 'inline-flex', justifyContent: 'flex-end' }} onClick={trailing ? e => e.stopPropagation() : undefined}>
          {trailing || (showChev ? <span className="s-select-row__chev"><Icon name="chevron_right" size={16} /></span> : null)}
        </span>
      ) : (
        <React.Fragment>
          {trailing ? <span style={{ flex: 'none', display: 'inline-flex' }} onClick={e => e.stopPropagation()}>{trailing}</span> : null}
          {showChev ? <span className="s-select-row__chev"><Icon name="chevron_right" size={16} /></span> : null}
        </React.Fragment>
      )}
      {selected ? <span className="s-select-row__icon"><Icon name="circle_check" size={iconSize} /></span> : null}
    </div>
  );
}

/* Notice — inline message block: icon · optional title · text · optional action.
   tone: error | warning | success | info. For errors reported in place, reasons
   for a disabled action, and warnings (mnemonic reveal). Qt: QFrame + HBox. */
const NOTICE_ICON = { error: 'circle_x', warning: 'alert', success: 'circle_check', info: 'info' };
export function Notice({ tone = 'info', title, children, action, icon, style }) {
  return (
    <div className={`s-notice s-notice--${tone}`} style={style} role={tone === 'error' ? 'alert' : undefined}>
      <span className="s-notice__icon"><Icon name={icon || NOTICE_ICON[tone]} size={16} /></span>
      <span className="s-notice__body">
        {title ? <span className="s-notice__title">{title}</span> : null}
        {children ? <span>{children}</span> : null}
      </span>
      {action ? <span style={{ flex: 'none', display: 'inline-flex', alignSelf: 'center' }}>{action}</span> : null}
    </div>
  );
}

/* ModalStatus — centered status column for "working…" / placeholder modals:
   spinner OR icon, a title, an optional subtitle, plus optional children (extra
   content, e.g. an empty-state lead). Modal buttons go in <ModalActions>, not here. */
export function ModalStatus({ spinner, icon, iconSize = 40, iconColor = 'var(--text-muted)', title, subtitle, children, pad = 'var(--space-l) 0' }) {
  return (
    <Stack align="center" gap="m" style={{ padding: pad }}>
      {spinner ? <Spinner /> : icon ? <span style={{ display: 'inline-flex', color: iconColor }}><Icon name={icon} size={iconSize} /></span> : null}
      {title ? <Text as="div" variant="section" weight="500" align="center">{title}</Text> : null}
      {subtitle ? <Text as="div" variant="body" color="muted" align="center" style={{ maxWidth: 320, lineHeight: 1.6 }}>{subtitle}</Text> : null}
      {children}
    </Stack>
  );
}

/* Legend — a colored swatch + label, for chart/diagram keys. */
export function Legend({ color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: color }} />{children}
    </span>
  );
}

/* The dropdown is portalled to <body> with fixed positioning, so it overlays
   everything and is never clipped by a table cell, scroll area or modal body.
   Qt: QComboBox popup (a top-level window). The highlighted item keeps the text
   colour on the hover background. `disabled`: bgSecondary, textSecondary text and
   chevron, borderLight border (like a disabled Input), and it does not open.
   `disabledOptions`: entries listed muted (textMuted), with no hover, that a click
   does not pick. `minWidth` (fit to contents): in place of the fixed `width`, the box is
   as wide as its longest option, never narrower than `minWidth` (Qt: setMinimumWidth +
   QComboBox::AdjustToContents). */
export function ComboBox({ value, options, onChange, width = 200, minWidth, disabled = false, disabledOptions = [] }) {
  const fit = minWidth != null;
  const [open, setOpen] = React.useState(false);
  const [rect, setRect] = React.useState(null);
  const ref = React.useRef(null);
  const toggle = () => {
    if (disabled) return;
    if (!open && ref.current) setRect(ref.current.getBoundingClientRect());
    setOpen(o => !o);
  };
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && ref.current.contains(e.target)) return; setOpen(false); };
    const off = () => setOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', off);
    document.addEventListener('scroll', off, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('resize', off); document.removeEventListener('scroll', off, true); };
  }, [open]);
  const list = open && rect ? ReactDOM.createPortal(
    <div style={{
      position: 'fixed', top: rect.bottom + 2, left: rect.left, width: rect.width, zIndex: 1000,
      background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-button)',
      /* rows inset and rounded: a highlighted first or last row stays inside the corners */
      padding: 'var(--pad-xxs)', overflow: 'hidden', boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
    }} onMouseDown={e => e.stopPropagation()}>
      {options.map(opt => {
        const off = disabledOptions.includes(opt);
        return (
          <div key={opt} className={off ? undefined : 'combo-item'} aria-disabled={off || undefined}
            style={{ padding: '6px 10px', borderRadius: 'var(--radius-input)', fontSize: 'var(--size-body)', color: off ? 'var(--text-muted)' : 'var(--text)', cursor: off ? 'default' : 'pointer', background: opt === value && !off ? 'var(--surface-hover)' : 'transparent' }}
            onMouseDown={off ? undefined : () => { onChange && onChange(opt); setOpen(false); }}>
            {opt}
          </div>
        );
      })}
    </div>, document.body) : null;
  return (
    <div ref={ref} style={{ position: 'relative', width: fit ? undefined : width, minWidth: fit ? minWidth : undefined, flex: 'none' }}>
      <span className={`s-combo${disabled ? ' is-disabled' : ''}`} aria-disabled={disabled || undefined} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', paddingRight: 26 }} onClick={toggle}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: disabled ? 'var(--text-secondary)' : 'var(--text)', display: 'inline-flex' }}>
          <Icon name="chevron_down" size={12} />
        </span>
      </span>
      {/* fit: the options, hidden, set the width at the box's text inset */}
      {fit ? <span aria-hidden="true" style={{ display: 'block', height: 0, overflow: 'hidden', visibility: 'hidden',
        padding: '0 calc(var(--combo-dropdown-w) + var(--pad-s)) 0 10px', border: '0 solid transparent', borderLeftWidth: 1, borderRightWidth: 1,
        fontSize: 'var(--size-body)', fontFamily: 'var(--font-sans)' }}>
        {options.map(opt => <span key={opt} style={{ display: 'block', whiteSpace: 'nowrap' }}>{opt}</span>)}
      </span> : null}
      {list}
    </div>
  );
}

/* ✓ / ✗ validation mark (Send.cpp setValidationIndicator) */
export function ValidationMark({ state }) {
  if (state === 'valid') return <span className="s-valid" style={{ width: 'var(--validation-mark-w)', textAlign: 'center' }}>✓</span>;
  if (state === 'invalid') return <span className="s-invalid" style={{ width: 'var(--validation-mark-w)', textAlign: 'center' }}>✗</span>;
  return <span style={{ width: 'var(--validation-mark-w)', display: 'inline-block' }} />;
}

/* Balance summary header used atop Coins / History */
function btcAmount(s) { return parseFloat(String(s).split(' ')[0]) || 0; }
function fmtBtc(n) { return n.toFixed(8); }

export function BalanceHeader({ wallet }) {
  const conf = btcAmount(wallet.confirmed);
  const unconf = btcAmount(wallet.unconfirmed);
  const unconfZero = unconf === 0;

  return (
    <div style={{ padding: '4px 4px 18px', marginBottom: 'var(--space-m)',
      borderBottom: '1px solid var(--border-light)' }}>
      <Row align="flex-end" gap="xl">
        {/* hero — balance */}
        <Stack gap={8}>
          <Eyebrow size={10} color="muted">Balance</Eyebrow>
          <Amount value={fmtBtc(conf)} size="hero" unit="BTC" reserve count={`(${wallet.confirmedCount})`} />
        </Stack>

        {/* small — unconfirmed, to the right */}
        <Row gap={8} style={{ flex: 'none', paddingBottom: 3, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none',
            background: unconfZero ? 'var(--text-muted)' : 'var(--warning)' }} />
          <Eyebrow size={10} color="muted">Unconfirmed</Eyebrow>
          <Amount value={fmtBtc(unconf)} size="sm" unit="BTC" reserve sign={unconfZero ? '' : '+'}
            tone={unconfZero ? 'muted' : undefined} count={`(${wallet.unconfirmedCount})`} />
        </Row>
      </Row>
    </div>
  );
}

/* Tab — a QTabWidget tab: label or icon + optional close affordance. The active tab
   takes the page bg; the menu/"+" tab passes closable={false}. Backed by the
   s-tab class so the chrome lives in CSS, not inline style. */
export function Tab({ label, icon, handle = false, active, closable, onClick, onClose }) {
  return (
    <div className={`s-tab ${handle ? 's-tab--handle' : ''} ${active ? 'is-active' : ''}`} onClick={onClick} title={icon ? label : undefined}>
      <span>{icon ? <Icon name={icon} size={16} /> : label}</span>
      {closable ? (
        <span className="s-tab__close" onClick={e => { e.stopPropagation(); if (onClose) onClose(); }}>
          <Icon name="x" size={12} />
        </span>
      ) : null}
    </div>
  );
}

Object.assign(window, { Button, Input, DateTimeInput, TextArea, Display, Field, FieldGroup, Checkbox, Toggle, Spinner, Card, Badge, SelectRow, Notice, ModalStatus, Legend, ComboBox, ValidationMark, BalanceHeader, Tab, useMeasure });

/* File-level namespace (DS compiler indexes this file as `Primitives`). */
export const Primitives = { Button, Input, DateTimeInput, TextArea, Display, Field, FieldGroup, Checkbox, Toggle, Spinner, Card, Badge, SelectRow, Notice, ModalStatus, Legend, ComboBox, ValidationMark, BalanceHeader, Tab };
