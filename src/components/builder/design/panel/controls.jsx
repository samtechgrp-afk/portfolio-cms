import { useId, useRef, useState } from 'react';
import { Icon } from '../../icons.jsx';
import { fixHex, formatColor, parseColor, hexOk } from '../color.js';
import { newId } from '../model.js';
import './panel.css';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const numOrEmpty = (s) => (s === '' || s === '-' ? '' : Number.isNaN(Number(s)) ? '' : Number(s));

/** A labelled row. `stack` puts the control under the label. */
export function Field({ label, children, hint, stack }) {
  return (
    <div className={`dp-field ${stack ? 'is-stack' : ''}`} role="group" aria-label={label}>
      {label && <span className="dp-label">{label}</span>}
      <div className="dp-control">{children}</div>
      {hint && <p className="cms-hint dp-hint">{hint}</p>}
    </div>
  );
}

/** Collapsible group, like a Figma panel section. */
export function Section({ title, children, defaultOpen = true, actions, badge }) {
  return (
    <details className="dp-section" open={defaultOpen}>
      <summary><span>{title}{badge ? <em className="dp-badge">{badge}</em> : null}</span><span className="dp-section__actions" onClick={(e) => e.preventDefault()}>{actions}</span></summary>
      <div className="dp-section__body">{children}</div>
    </details>
  );
}

export function NumInput({ value, onChange, label, min, max, step = 1, suffix, placeholder, width }) {
  return (
    <label className="dp-num" style={width ? { width } : undefined}>
      <span className="dp-num__label">{label}</span>
      <input
        type="number" inputMode="decimal" className="cms-input" min={min} max={max} step={step} placeholder={placeholder}
        value={value ?? ''} aria-label={label} style={{ paddingLeft: 12 + Math.max(1, label.length) * 7 }}
        onChange={(e) => { const n = numOrEmpty(e.target.value); onChange(n === '' ? '' : clamp(n, min ?? -Infinity, max ?? Infinity)); }}
      />
      {suffix && <span className="dp-num__suffix" aria-hidden="true">{suffix}</span>}
    </label>
  );
}

/** Value + unit, e.g. 320 px, 50 %, 100 vh, or auto. */
export function UnitInput({ value, onChange, label, units = ['px', '%', 'vh', 'vw', 'auto'] }) {
  const v = value || { v: '', u: units[0] };
  const u = v.u || units[0];
  return (
    <div className="dp-unit">
      <label className="dp-num">
        <span className="dp-num__label">{label}</span>
        <input type="number" inputMode="decimal" className="cms-input" style={{ paddingLeft: 12 + Math.max(1, label.length) * 7 }} aria-label={label} disabled={u === 'auto'} placeholder={u === 'auto' ? 'auto' : '—'} value={u === 'auto' ? '' : v.v ?? ''} onChange={(e) => onChange({ ...v, u, v: numOrEmpty(e.target.value) })} />
      </label>
      <select className="cms-input dp-unit__sel" aria-label={`${label} unit`} value={u} onChange={(e) => onChange({ ...v, u: e.target.value, v: e.target.value === 'auto' ? '' : v.v })}>
        {units.map((x) => <option key={x}>{x}</option>)}
      </select>
    </div>
  );
}

/** A row of mutually exclusive buttons. `icons` shows an icon instead of text (label stays for screen readers). */
export function Segmented({ value, onChange, options, label, small }) {
  return (
    <div className={`dp-seg ${small ? 'is-small' : ''}`} role="radiogroup" aria-label={label}>
      {options.map(([v, text, title]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} title={title || text} className={value === v ? 'is-on' : ''} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export function Check({ checked, onChange, label, hint }) {
  return (
    <div className="bb-field dp-check">
      <label className="bb-toggle"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>
      {hint && <p className="cms-hint">{hint}</p>}
    </div>
  );
}

/** Colour with alpha. The text box understands Hex, RGB or HSL (pick the format on the left). */
export function ColorInput({ value, onChange, label }) {
  const id = useId();
  const col = value || { c: '#000000', a: 100 };
  const [format, setFormat] = useState('hex');
  const [draft, setDraft] = useState(null);
  const text = draft ?? formatColor(col.c, format);
  const commit = (t) => { const hex = parseColor(t, format); if (hex) onChange({ ...col, c: hex }); setDraft(null); };
  return (
    <div className="dp-color" role="group" aria-label={label}>
      <input type="color" aria-label={`${label} swatch`} value={hexOk(col.c) ? col.c : '#000000'} onChange={(e) => onChange({ ...col, c: fixHex(e.target.value) })} />
      <select className="cms-input dp-color__fmt" aria-label={`${label} format`} value={format} onChange={(e) => { setFormat(e.target.value); setDraft(null); }}>
        <option value="hex">Hex</option><option value="rgb">RGB</option><option value="hsl">HSL</option>
      </select>
      <input id={id} type="text" className="cms-input dp-color__text" aria-label={`${label} value`} value={text} spellCheck={false}
        onChange={(e) => setDraft(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commit(e.currentTarget.value); }} />
      <label className="dp-color__alpha">
        <input type="number" className="cms-input" min={0} max={100} aria-label={`${label} opacity`} value={col.a ?? 100} onChange={(e) => onChange({ ...col, a: clamp(Number(e.target.value) || 0, 0, 100) })} />
        <span aria-hidden="true">%</span>
      </label>
    </div>
  );
}

/** 3 x 3 alignment grid. */
export function AlignMatrix({ ax = 'left', ay = 'top', onChange }) {
  const X = ['left', 'center', 'right'], Y = ['top', 'middle', 'bottom'];
  const names = { left: 'left', center: 'centre', right: 'right', top: 'top', middle: 'middle', bottom: 'bottom' };
  return (
    <div className="dp-matrix" role="radiogroup" aria-label="Alignment">
      {Y.map((y) => X.map((x) => {
        const on = ax === x && ay === y;
        return (
          <button key={`${x}${y}`} type="button" role="radio" aria-checked={on} aria-label={`${names[y]} ${names[x]}`} className={on ? 'is-on' : ''} onClick={() => onChange({ ax: x, ay: y })}><i /></button>
        );
      }))}
    </div>
  );
}

/** One value for all four sides, or one each. `names` are the side labels in the order top, right, bottom, left (or the corner names). */
export function Box4({ value, onChange, label, names, short, min = 0, max = 999 }) {
  const v = value || { mode: 'uniform', all: 0, a: 0, b: 0, c: 0, d: 0 };
  const keys = ['a', 'b', 'c', 'd'];
  const each = v.mode === 'each';
  return (
    <div className="dp-box4" role="group" aria-label={label}>
      <div className="dp-box4__top">
        {!each && <NumInput label={label} value={v.all} min={min} max={max} onChange={(n) => onChange({ ...v, all: n })} suffix="px" />}
        {each && <span className="dp-hint-line">{label}: one value per {short}</span>}
        <button type="button" className={`dp-icon ${each ? 'is-on' : ''}`} aria-pressed={each} title={each ? 'Use one value for all' : `Set each ${short} separately`}
          onClick={() => onChange(each ? { ...v, mode: 'uniform' } : { ...v, mode: 'each', a: v.all ?? 0, b: v.all ?? 0, c: v.all ?? 0, d: v.all ?? 0 })}>
          <Icon name="grid" size={14} /><span className="dp-sr">{each ? 'Use one value for all' : `Set each ${short} separately`}</span>
        </button>
      </div>
      {each && <div className="dp-box4__grid">{keys.map((k, i) => <NumInput key={k} label={names[i]} value={v[k]} min={min} max={max} onChange={(n) => onChange({ ...v, [k]: n })} />)}</div>}
    </div>
  );
}

/** Colour-stop bar: click to add a stop, drag to move, arrow keys to nudge, Delete to remove. */
export function GradientBar({ stops, onChange, selected, onSelect }) {
  const bar = useRef(null);
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const css = `linear-gradient(90deg, ${sorted.map((s) => `${s.color.c} ${s.pos}%`).join(', ')})`;
  const posFrom = (clientX) => { const r = bar.current.getBoundingClientRect(); return clamp(Math.round(((clientX - r.left) / r.width) * 100), 0, 100); };
  const set = (id, patch) => onChange(stops.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const drag = (e, id) => {
    e.preventDefault(); e.stopPropagation(); onSelect(id);
    const el = e.currentTarget; el.setPointerCapture(e.pointerId);
    const move = (ev) => set(id, { pos: posFrom(ev.clientX) });
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  };
  const remove = (id) => { if (stops.length > 2) { const rest = stops.filter((s) => s.id !== id); onChange(rest); onSelect(rest[0].id); } };
  const add = (e) => {
    if (e.target !== e.currentTarget) return;
    const pos = posFrom(e.clientX);
    const near = sorted.reduce((a, b) => (Math.abs(b.pos - pos) < Math.abs(a.pos - pos) ? b : a));
    const stop = { id: newId(), pos, color: { ...near.color } };
    onChange([...stops, stop]); onSelect(stop.id);
  };
  return (
    <div className="dp-grad">
      <div className="dp-grad__bar" ref={bar} style={{ backgroundImage: css }} onPointerDown={add} title="Click to add a colour stop">
        {stops.map((s) => (
          <button
            key={s.id} type="button" className={`dp-grad__stop ${selected === s.id ? 'is-on' : ''}`} style={{ left: `${s.pos}%`, '--c': s.color.c }}
            aria-label={`Colour stop at ${s.pos}%`} onPointerDown={(e) => drag(e, s.id)} onFocus={() => onSelect(s.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); set(s.id, { pos: clamp(s.pos + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1), 0, 100) }); }
              if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(s.id); }
            }}
          />
        ))}
      </div>
      <p className="cms-hint">Click the bar to add a stop. Drag a stop, or use the arrow keys. Delete removes the selected stop.</p>
    </div>
  );
}
export { newId };
