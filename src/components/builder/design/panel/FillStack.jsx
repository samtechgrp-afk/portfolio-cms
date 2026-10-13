import { useRef, useState } from 'react';
import { Icon } from '../../icons.jsx';
import { BLEND_MODES, newGradient, newId, newImageFill, newSolid } from '../model.js';
import { cssUrl } from '../../widgets/shared.jsx';
import { ColorInput, Field, GradientBar, NumInput, Segmented } from './controls.jsx';
import { rgba } from '../color.js';

const TYPES = [['solid', 'Solid'], ['linear', 'Linear gradient'], ['radial', 'Radial gradient'], ['angular', 'Angular gradient'], ['diamond', 'Diamond gradient'], ['image', 'Image']];
const isGrad = (t) => ['linear', 'radial', 'angular', 'diamond'].includes(t);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/** Drag to pan the image, slider to zoom: what you see here is how the fill is cropped. */
export function CropPreview({ fill, onChange }) {
  const ref = useRef(null);
  const url = cssUrl(fill.url);
  const px = fill.posX ?? 50, py = fill.posY ?? 50;
  const down = (e) => {
    e.preventDefault();
    const el = ref.current; el.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, px, py };
    const move = (ev) => {
      const r = el.getBoundingClientRect();
      onChange({ posX: clamp(Math.round(start.px - ((ev.clientX - start.x) / r.width) * 100), 0, 100), posY: clamp(Math.round(start.py - ((ev.clientY - start.y) / r.height) * 100), 0, 100) });
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  };
  const key = (e) => {
    const s = e.shiftKey ? 10 : 2; const m = { ArrowLeft: [s, 0], ArrowRight: [-s, 0], ArrowUp: [0, s], ArrowDown: [0, -s] }[e.key];
    if (m) { e.preventDefault(); onChange({ posX: clamp(px + m[0], 0, 100), posY: clamp(py + m[1], 0, 100) }); }
  };
  return (
    <div className="dp-crop" ref={ref} tabIndex={0} role="group" aria-label="Crop preview. Drag, or use the arrow keys, to move the image." onPointerDown={down} onKeyDown={key}
      style={{ backgroundImage: url, backgroundSize: `${fill.scale ?? 100}% auto`, backgroundPosition: `${px}% ${py}%` }}>
      <span>Drag to move</span>
    </div>
  );
}

function ImageFill({ f, set }) {
  return (
    <>
      <Field label="Image link" stack><input type="url" className="cms-input" aria-label="Image link" placeholder="https://" value={f.url || ''} onChange={(e) => set({ url: e.target.value })} /></Field>
      <Field label="Fit"><Segmented small label="Image fit" value={f.fit || 'fill'} onChange={(v) => set({ fit: v })} options={[['fill', 'Fill'], ['fit', 'Fit'], ['crop', 'Crop'], ['tile', 'Tile']]} /></Field>
      {f.fit === 'crop' && (
        <>
          <CropPreview fill={f} onChange={set} />
          <Field label="Zoom"><div className="bb-range" style={{ width: '100%' }}><input type="range" min={100} max={400} step={5} aria-label="Zoom" value={f.scale ?? 100} onChange={(e) => set({ scale: Number(e.target.value) })} /><output>{f.scale ?? 100}%</output></div></Field>
        </>
      )}
      {f.fit === 'tile' && <Field label="Tile size"><NumInput label="px" value={f.tile ?? 200} min={8} max={1200} onChange={(n) => set({ tile: n })} /></Field>}
      {f.fit !== 'crop' && f.fit !== 'tile' && <Field label="Position"><NumInput label="X" value={f.posX ?? 50} min={0} max={100} suffix="%" onChange={(n) => set({ posX: n })} /><NumInput label="Y" value={f.posY ?? 50} min={0} max={100} suffix="%" onChange={(n) => set({ posY: n })} /></Field>}
    </>
  );
}

function FillRow({ f, onChange, onRemove, onMove, first, last }) {
  const [sel, setSel] = useState(f.stops?.[0]?.id);
  const set = (p) => onChange({ ...f, ...p });
  const stop = f.stops?.find((s) => s.id === sel) || f.stops?.[0];
  const changeType = (t) => {
    if (t === f.type) return;
    if (t === 'solid') return onChange({ id: f.id, type: 'solid', visible: f.visible, opacity: f.opacity, blend: f.blend, color: f.color || f.stops?.[0]?.color || { c: '#d9dde6', a: 100 } });
    if (t === 'image') return onChange({ ...newImageFill(), id: f.id, visible: f.visible, blend: f.blend });
    const g = newGradient(t);
    onChange({ ...g, id: f.id, visible: f.visible, opacity: f.opacity, blend: f.blend, stops: f.stops || (f.color ? [{ id: newId(), pos: 0, color: f.color }, { id: newId(), pos: 100, color: { ...f.color, a: 0 } }] : g.stops) });
  };
  const swatch = f.type === 'solid' ? rgba(f.color, f.opacity) : f.type === 'image' ? '#8a90a2' : `linear-gradient(90deg, ${[...(f.stops || [])].sort((a, b) => a.pos - b.pos).map((s) => `${s.color.c} ${s.pos}%`).join(', ')})`;
  return (
    <div className={`dp-layer ${f.visible === false ? 'is-off' : ''}`}>
      <div className="dp-layer__head">
        <span className="dp-layer__swatch" aria-hidden="true"><i style={{ background: swatch }} /></span>
        <select className="cms-input" aria-label="Fill type" value={f.type} onChange={(e) => changeType(e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button type="button" className="dp-icon" aria-pressed={f.visible !== false} onClick={() => set({ visible: f.visible === false })}><Icon name={f.visible === false ? 'eye-off' : 'eye'} size={14} /><span className="dp-sr">{f.visible === false ? 'Show fill' : 'Hide fill'}</span></button>
        <button type="button" className="dp-icon" disabled={first} onClick={() => onMove(-1)}><Icon name="arrow-up" size={14} /><span className="dp-sr">Move fill up</span></button>
        <button type="button" className="dp-icon" disabled={last} onClick={() => onMove(1)}><Icon name="arrow-down" size={14} /><span className="dp-sr">Move fill down</span></button>
        <button type="button" className="dp-icon is-danger" onClick={onRemove}><Icon name="trash" size={14} /><span className="dp-sr">Remove fill</span></button>
      </div>
      {f.type === 'solid' && <Field label="Colour"><ColorInput label="Fill colour" value={f.color} onChange={(c) => set({ color: c })} /></Field>}
      {isGrad(f.type) && (
        <>
          <GradientBar stops={f.stops} selected={stop?.id} onSelect={setSel} onChange={(stops) => set({ stops })} />
          {stop && (
            <>
              <Field label="Stop colour"><ColorInput label="Stop colour" value={stop.color} onChange={(c) => set({ stops: f.stops.map((s) => (s.id === stop.id ? { ...s, color: c } : s)) })} /></Field>
              <Field label="Stop position"><NumInput label="%" value={stop.pos} min={0} max={100} onChange={(n) => set({ stops: f.stops.map((s) => (s.id === stop.id ? { ...s, pos: n === '' ? 0 : n } : s)) })} />
                <button type="button" className="cms-btn cms-btn--sm" disabled={f.stops.length <= 2} onClick={() => { const rest = f.stops.filter((s) => s.id !== stop.id); set({ stops: rest }); setSel(rest[0].id); }}>Remove stop</button></Field>
            </>
          )}
          {(f.type === 'linear' || f.type === 'angular') && (
            <Field label={f.type === 'linear' ? 'Angle' : 'Start angle'}><div className="bb-range" style={{ width: '100%' }}><input type="range" min={0} max={360} aria-label="Gradient angle" value={f.angle ?? 0} onChange={(e) => set({ angle: Number(e.target.value) })} /><output>{f.angle ?? 0}°</output></div></Field>
          )}
          {(f.type === 'radial' || f.type === 'angular') && <Field label="Centre"><NumInput label="X" value={f.cx ?? 50} min={0} max={100} suffix="%" onChange={(n) => set({ cx: n })} /><NumInput label="Y" value={f.cy ?? 50} min={0} max={100} suffix="%" onChange={(n) => set({ cy: n })} /></Field>}
        </>
      )}
      {f.type === 'image' && <ImageFill f={f} set={set} />}
      {f.type !== 'image' && <Field label="Opacity"><div className="bb-range" style={{ width: '100%' }}><input type="range" min={0} max={100} aria-label="Fill opacity" value={f.opacity ?? 100} onChange={(e) => set({ opacity: Number(e.target.value) })} /><output>{f.opacity ?? 100}%</output></div></Field>}
      <Field label="Blend"><select className="cms-input" aria-label="Fill blend mode" value={f.blend || 'normal'} onChange={(e) => set({ blend: e.target.value })}>{BLEND_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
    </div>
  );
}

/** The stack of fills. The top row paints on top, like layers in Figma. */
export function FillStack({ fills, onChange }) {
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= fills.length) return; const c = [...fills]; [c[i], c[j]] = [c[j], c[i]]; onChange(c); };
  return (
    <>
      {fills.map((f, i) => (
        <FillRow key={f.id} f={f} first={i === 0} last={i === fills.length - 1} onMove={(d) => move(i, d)}
          onChange={(n) => onChange(fills.map((x, k) => (k === i ? n : x)))} onRemove={() => onChange(fills.filter((_, k) => k !== i))} />
      ))}
      <div className="dp-control">
        <button type="button" className="cms-btn cms-btn--sm dp-add" onClick={() => onChange([newSolid(), ...fills])}><Icon name="plus" size={14} /> Add fill</button>
        <button type="button" className="cms-btn cms-btn--sm dp-add" onClick={() => onChange([newGradient('linear'), ...fills])}><Icon name="plus" size={14} /> Gradient</button>
        <button type="button" className="cms-btn cms-btn--sm dp-add" onClick={() => onChange([newImageFill(), ...fills])}><Icon name="plus" size={14} /> Image</button>
      </div>
      {fills.length > 1 && <p className="dp-note">The top fill paints over the ones below it. Use Blend to mix them.</p>}
    </>
  );
}
