import { useEffect, useState } from 'react';
import { Icon } from '../../icons.jsx';
import { BLEND_MODES, STATES, STATE_KEYS, hasDesign, newEffect, newGradient, newId, newImageFill, newSolid, newStroke } from '../model.js';
import { setStatePreview } from '../preview.js';
import { rgba } from '../color.js';
import { Box4, Check, ColorInput, Field, GradientBar, NumInput, Section, Segmented, UnitInput } from './controls.jsx';
import { FillStack } from './FillStack.jsx';
import './panel.css';

const WEIGHTS = [[100, 'Thin'], [200, 'Extra light'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra bold'], [900, 'Black']];
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const radiusToBox = (r) => (r ? { mode: r.mode || 'uniform', all: r.all ?? 0, a: r.tl ?? 0, b: r.tr ?? 0, c: r.br ?? 0, d: r.bl ?? 0 } : undefined);
const boxToRadius = (b) => ({ mode: b.mode, all: b.all, tl: b.a, tr: b.b, br: b.c, bl: b.d });

function StrokeEditor({ stroke, onChange, onRemove }) {
  const s = stroke;
  const set = (p) => onChange({ ...s, ...p });
  const sides = { t: true, r: true, b: true, l: true, ...(s.sides || {}) };
  const toggle = (k) => set({ sides: { ...sides, [k]: !sides[k] } });
  return (
    <div className="dp-layer">
      <div className="dp-layer__head">
        <strong>Stroke</strong>
        <span style={{ flex: 1 }} />
        <button type="button" className="dp-icon is-danger" onClick={onRemove}><Icon name="trash" size={14} /><span className="dp-sr">Remove stroke</span></button>
      </div>
      <Field label="Colour"><ColorInput label="Stroke colour" value={s.color} onChange={(c) => set({ color: c })} /></Field>
      <Field label="Weight"><NumInput label="W" value={s.weight} min={0} max={80} step={0.5} suffix="px" onChange={(n) => set({ weight: n })} /></Field>
      <Field label="Position"><Segmented label="Stroke position" value={s.position || 'inside'} onChange={(v) => set({ position: v })} options={[['inside', 'Inside'], ['center', 'Center'], ['outside', 'Outside']]} /></Field>
      <Field label="Sides">
        <div className="dp-seg is-small" role="group" aria-label="Sides with a stroke">
          {[['t', 'Top'], ['r', 'Right'], ['b', 'Bottom'], ['l', 'Left']].map(([k, n]) => <button key={k} type="button" aria-pressed={sides[k]} className={sides[k] ? 'is-on' : ''} onClick={() => toggle(k)}>{n}</button>)}
        </div>
      </Field>
      <Field label="Pattern"><Segmented label="Stroke pattern" value={s.dash || 'solid'} onChange={(v) => set({ dash: v })} options={[['solid', 'Solid'], ['dashed', 'Dashed'], ['custom', 'Custom']]} /></Field>
      {s.dash === 'custom' && (
        <Field label="Dash, gap"><NumInput label="D" value={s.dashLen} min={1} max={200} onChange={(n) => set({ dashLen: n })} /><NumInput label="G" value={s.gap} min={0} max={200} onChange={(n) => set({ gap: n })} /></Field>
      )}
      <Field label="Caps" hint="Caps and joins show on dashed or custom patterns.">
        <Segmented small label="Line cap" value={s.cap || 'butt'} onChange={(v) => set({ cap: v })} options={[['butt', 'Butt'], ['round', 'Round'], ['square', 'Square']]} />
      </Field>
      <Field label="Joins"><Segmented small label="Line join" value={s.join || 'miter'} onChange={(v) => set({ join: v })} options={[['miter', 'Miter'], ['bevel', 'Bevel'], ['round', 'Round']]} /></Field>
    </div>
  );
}

const EFFECT_TYPES = [['drop', 'Drop shadow'], ['inner', 'Inner shadow'], ['layerBlur', 'Layer blur'], ['bgBlur', 'Background blur']];
function EffectRow({ e, onChange, onRemove }) {
  const set = (p) => onChange({ ...e, ...p });
  const shadow = e.type === 'drop' || e.type === 'inner';
  return (
    <div className={`dp-layer ${e.visible === false ? 'is-off' : ''}`}>
      <div className="dp-layer__head">
        <button type="button" className="dp-icon" aria-pressed={e.visible !== false} onClick={() => set({ visible: e.visible === false })}><Icon name={e.visible === false ? 'eye-off' : 'eye'} size={14} /><span className="dp-sr">{e.visible === false ? 'Show effect' : 'Hide effect'}</span></button>
        <select className="cms-input" aria-label="Effect type" value={e.type} onChange={(ev) => {
          const t = ev.target.value; const was = e.type === 'drop' || e.type === 'inner'; const now = t === 'drop' || t === 'inner';
          onChange(was === now ? { ...e, type: t } : { ...newEffect(t), id: e.id, visible: e.visible });
        }}>{EFFECT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button type="button" className="dp-icon is-danger" onClick={onRemove}><Icon name="trash" size={14} /><span className="dp-sr">Remove effect</span></button>
      </div>
      {shadow && <>
        <Field label="Offset"><NumInput label="X" value={e.x} min={-400} max={400} onChange={(n) => set({ x: n })} /><NumInput label="Y" value={e.y} min={-400} max={400} onChange={(n) => set({ y: n })} /></Field>
        <Field label="Blur, spread"><NumInput label="B" value={e.blur} min={0} max={400} onChange={(n) => set({ blur: n })} /><NumInput label="S" value={e.spread} min={-200} max={200} onChange={(n) => set({ spread: n })} /></Field>
        <Field label="Colour"><ColorInput label="Shadow colour" value={e.color} onChange={(c) => set({ color: c })} /></Field>
      </>}
      {!shadow && <Field label="Blur" hint={e.type === 'bgBlur' ? 'Frosted glass: blurs what is behind this block. Give the block a semi-transparent fill to see it.' : 'Blurs the block itself.'}><NumInput label="B" value={e.blur} min={0} max={200} suffix="px" onChange={(n) => set({ blur: n })} /></Field>}
    </div>
  );
}

function Typography({ t = {}, onChange, fontControl }) {
  const set = (p) => onChange(clean({ ...t, ...p }));
  const lh = t.lh || { mode: 'auto' };
  const ls = t.ls || { v: '', u: 'px' };
  return (
    <>
      {fontControl}
      <Field label="Weight">
        <select className="cms-input" aria-label="Font weight" value={t.weight || ''} onChange={(e) => set({ weight: e.target.value ? Number(e.target.value) : undefined })}>
          <option value="">Default</option>{WEIGHTS.map(([v, n]) => <option key={v} value={v}>{v} {n}</option>)}
        </select>
        <button type="button" className={`dp-icon ${t.italic ? 'is-on' : ''}`} aria-pressed={!!t.italic} onClick={() => set({ italic: !t.italic })}><em aria-hidden="true">I</em><span className="dp-sr">Italic</span></button>
      </Field>
      <Field label="Size"><UnitInput label="Size" value={t.size || { v: '', u: 'px' }} units={['px', 'rem', 'em']} onChange={(v) => set({ size: v })} /></Field>
      <Field label="Line height">
        <Segmented small label="Line height mode" value={lh.mode || 'auto'} onChange={(m) => set({ lh: { mode: m, v: lh.v ?? (m === 'pct' ? 120 : 24) } })} options={[['auto', 'Auto'], ['px', 'px'], ['pct', '%']]} />
        {lh.mode !== 'auto' && <NumInput label="LH" value={lh.v} min={1} max={400} onChange={(n) => set({ lh: { ...lh, v: n } })} />}
      </Field>
      <Field label="Letter spacing">
        <NumInput label="LS" value={ls.v} min={-50} max={100} step={0.1} onChange={(n) => set({ ls: { ...ls, v: n } })} />
        <Segmented small label="Letter spacing unit" value={ls.u || 'px'} onChange={(u) => set({ ls: { ...ls, u } })} options={[['px', 'px'], ['%', '%']]} />
      </Field>
      <Field label="Paragraph"><NumInput label="Sp" value={t.pSpace} min={0} max={200} onChange={(n) => set({ pSpace: n })} /><NumInput label="In" value={t.indent} min={0} max={200} onChange={(n) => set({ indent: n })} /></Field>
      <p className="dp-note">Paragraph: spacing below each paragraph (Sp) and first-line indent (In), in px.</p>
      <Field label="Align"><Segmented small label="Horizontal alignment" value={t.align || ''} onChange={(v) => set({ align: v || undefined })} options={[['left', 'Left'], ['center', 'Centre'], ['right', 'Right'], ['justify', 'Justify']]} /></Field>
      <Field label="Vertical"><Segmented small label="Vertical alignment" value={t.valign || 'top'} onChange={(v) => set({ valign: v })} options={[['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']]} /></Field>
      <Field label="Decoration"><Segmented small label="Text decoration" value={t.deco || 'none'} onChange={(v) => set({ deco: v })} options={[['none', 'None'], ['underline', 'Underline'], ['line-through', 'Strike']]} /></Field>
      <Field label="Case"><Segmented small label="Text case" value={t.tcase || 'none'} onChange={(v) => set({ tcase: v })} options={[['none', 'Original'], ['upper', 'UPPER'], ['lower', 'lower'], ['title', 'Title']]} /></Field>
      <Field label="Resizing" hint="Auto width: one line that grows. Auto height: wraps inside the width above. Fixed: keeps the size and clips or truncates.">
        <Segmented small label="Text resizing" value={t.resize || 'auto-h'} onChange={(v) => set({ resize: v })} options={[['auto-w', 'Auto width'], ['auto-h', 'Auto height'], ['fixed', 'Fixed']]} />
      </Field>
      {t.resize === 'fixed' && (
        <>
          <Check label="Truncate with an ellipsis (…)" checked={t.truncate} onChange={(v) => set({ truncate: v })} />
          {t.truncate && <Field label="Max lines"><NumInput label="n" value={t.lines} min={1} max={20} onChange={(n) => set({ lines: n })} /></Field>}
        </>
      )}
    </>
  );
}

/**
 * The universal Design tab. Edits `props.design`. In a state tab (Hover ...) it edits only that state's overrides,
 * layered over the Default design.
 */
export default function DesignPanel({ block, props, onChange, showType, fontControl, mode = 'css' }) {
  const noRadius = mode !== 'css';
  const noFill = mode === 'line';
  const design = props.design || {};
  const [state, setState] = useState('default');
  useEffect(() => { setState('default'); }, [block.id]);
  useEffect(() => { setStatePreview(block.id, state); return () => setStatePreview(null, null); }, [block.id, state]);

  const isState = state !== 'default';
  const override = design.states?.[state] || {};
  const src = isState ? { ...design, ...override } : design;
  const commit = (next) => onChange({ design: clean(next) });
  const set = (patch) => {
    if (!isState) return commit({ ...design, ...patch });
    const o = clean({ ...override, ...patch });
    const states = { ...design.states, [state]: o };
    if (!hasDesign(o)) delete states[state];
    return commit({ ...design, states: Object.keys(states).length ? states : undefined });
  };
  const reset = (key) => { const o = { ...override }; delete o[key]; const states = { ...design.states, [state]: o }; if (!hasDesign(o)) delete states[state]; commit({ ...design, states: Object.keys(states).length ? states : undefined }); };
  const overridden = (k) => isState && k in override;
  const resetBtn = (k) => (overridden(k) ? <button type="button" className="cms-btn cms-btn--sm" onClick={() => reset(k)}>Reset</button> : null);
  const badge = (k) => (overridden(k) ? 'changed' : undefined);

  const d = src;
  const lockOn = (v) => {
    const w = d.w, h = d.h;
    const ratio = w?.u === 'px' && h?.u === 'px' && Number(w.v) > 0 && Number(h.v) > 0 ? +(w.v / h.v).toFixed(3) : d.ratio || 1;
    set({ lock: v || undefined, ratio: v ? ratio : undefined });
  };
  const fills = d.fills || [];
  const fillSwatch = fills.find((f) => f.visible !== false);

  return (
    <div className="dp">
      <div className="dp-states" role="group" aria-label="Design state">
        {STATES.map(([v, l]) => <button key={v} type="button" aria-pressed={state === v} className={v !== 'default' && design.states?.[v] ? 'has-override' : ''} onClick={() => setState(v)}>{l}</button>)}
      </div>
      {isState && <p className="dp-note">Editing the <strong>{STATES.find(([v]) => v === state)[1]}</strong> look. Only what you change here differs from Default, and the canvas shows it while this tab is open.</p>}
      {state === 'disabled' && <Check label="Show this block as disabled" checked={design.disabled} onChange={(v) => commit({ ...design, disabled: v || undefined })} hint="Turn this on to use the Disabled look all the time (on the page it is not tied to a form control)." />}

      {!isState && (
        <Section title="Layout">
          <Field label="Width"><UnitInput label="W" value={d.w} onChange={(v) => set({ w: v })} /></Field>
          <Field label="Height"><UnitInput label="H" value={d.h} onChange={(v) => set({ h: v })} /></Field>
          <Check label="Lock aspect ratio" checked={d.lock} onChange={lockOn} hint="Keeps width and height in proportion. Set one of them." />
          {d.lock && <Field label="Ratio (W ÷ H)"><NumInput label="R" value={d.ratio} min={0.05} max={20} step={0.01} onChange={(n) => set({ ratio: n })} /></Field>}
          <details className="dp-more"><summary>Min and max size</summary>
            <Field label="Min width"><UnitInput label="Min W" value={d.minW} units={['px', '%', 'vw']} onChange={(v) => set({ minW: v })} /></Field>
            <Field label="Max width"><UnitInput label="Max W" value={d.maxW} units={['px', '%', 'vw']} onChange={(v) => set({ maxW: v })} /></Field>
            <Field label="Min height"><UnitInput label="Min H" value={d.minH} units={['px', '%', 'vh']} onChange={(v) => set({ minH: v })} /></Field>
            <Field label="Max height"><UnitInput label="Max H" value={d.maxH} units={['px', '%', 'vh']} onChange={(v) => set({ maxH: v })} /></Field>
          </details>
          <Field label="Position"><NumInput label="X" value={d.x} min={-5000} max={5000} onChange={(n) => set({ x: n })} /><NumInput label="Y" value={d.y} min={-5000} max={5000} onChange={(n) => set({ y: n })} /></Field>
          <Field label="Rotation"><NumInput label="°" value={d.rot} min={-360} max={360} onChange={(n) => set({ rot: n })} suffix="deg" /></Field>
          <Check label="Clip content" checked={d.clip} onChange={(v) => set({ clip: v || undefined })} hint="Hides anything that sticks out of the box. Off lets it overflow." />

          <p className="dp-sub">Inside a Frame</p>
          <Field label="Width rule"><Segmented small label="Width rule" value={d.sizeW || 'fixed'} onChange={(v) => set({ sizeW: v === 'fixed' ? undefined : v })} options={[['fixed', 'Fixed'], ['hug', 'Hug'], ['fill', 'Fill']]} /></Field>
          <Field label="Height rule"><Segmented small label="Height rule" value={d.sizeH || 'fixed'} onChange={(v) => set({ sizeH: v === 'fixed' ? undefined : v })} options={[['fixed', 'Fixed'], ['hug', 'Hug'], ['fill', 'Fill']]} /></Field>
          <Check label="Absolute position" checked={d.abs} onChange={(v) => set({ abs: v || undefined })} hint="Takes this block out of the Frame's flow so it sits at X and Y (like Figma's absolute position). Works inside a Frame." />
          {d.abs && (
            <>
              <Field label="Pin horizontally"><select className="cms-input" aria-label="Horizontal constraint" value={d.pinH || 'left'} onChange={(e) => set({ pinH: e.target.value })}>
                <option value="left">Left</option><option value="right">Right</option><option value="both">Left and right</option><option value="center">Center</option><option value="scale">Scale (percent)</option></select></Field>
              <Field label="Pin vertically"><select className="cms-input" aria-label="Vertical constraint" value={d.pinV || 'top'} onChange={(e) => set({ pinV: e.target.value })}>
                <option value="top">Top</option><option value="bottom">Bottom</option><option value="both">Top and bottom</option><option value="center">Center</option><option value="scale">Scale (percent)</option></select></Field>
              {(d.pinH === 'both' || d.pinV === 'both') && <Field label="Other edge"><NumInput label="X2" value={d.x2} onChange={(n) => set({ x2: n })} /><NumInput label="Y2" value={d.y2} onChange={(n) => set({ y2: n })} /></Field>}
              <p className="dp-note">Left, right, top and bottom measure from that edge. Scale uses percentages of the Frame, so X, Y, Width and Height become %.</p>
            </>
          )}
        </Section>
      )}

      <Section title="Appearance" badge={badge('opacity') || badge('radius') || badge('rot') || badge('scale')}
        actions={isState ? [resetBtn('opacity'), resetBtn('radius')].filter(Boolean) : null}>
        <Field label="Opacity"><div className="bb-range" style={{ width: '100%' }}><input type="range" min={0} max={100} aria-label="Opacity" value={d.opacity ?? 100} onChange={(e) => set({ opacity: Number(e.target.value) })} /><output>{d.opacity ?? 100}%</output></div></Field>
        {!isState && <Field label="Blend mode"><select className="cms-input" aria-label="Layer blend mode" value={d.blend || 'normal'} onChange={(e) => set({ blend: e.target.value === 'normal' ? undefined : e.target.value })}>{BLEND_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>}
        {isState && <>
          <Field label="Rotation"><NumInput label="°" value={d.rot} min={-360} max={360} onChange={(n) => set({ rot: n })} suffix="deg" /></Field>
          <Field label="Scale"><div className="bb-range" style={{ width: '100%' }}><input type="range" min={50} max={150} aria-label="Scale" value={d.scale ?? 100} onChange={(e) => set({ scale: Number(e.target.value) })} /><output>{d.scale ?? 100}%</output></div></Field>
        </>}
        {!noRadius && (
          <>
            <Field label="Corner radius" stack><Box4 label="Radius" short="corner" names={['TL', 'TR', 'BR', 'BL']} value={radiusToBox(d.radius)} onChange={(b) => set({ radius: boxToRadius(b) })} /></Field>
            {!isState && d.radius && (
              <Field label="Corner smoothing" hint="0 is a normal round corner. Higher values bend into a squircle, like iOS icons. Shown in browsers that support it (current Chrome and Edge); others keep the round corner.">
                <div className="bb-range" style={{ width: '100%' }}><input type="range" min={0} max={100} step={5} aria-label="Corner smoothing" value={d.smooth ?? 0} onChange={(e) => set({ smooth: Number(e.target.value) || undefined })} /><output>{d.smooth ?? 0}%</output></div>
              </Field>
            )}
          </>
        )}
      </Section>

      {!noFill && (
        <Section title="Fill" badge={badge('fills')} actions={[resetBtn('fills')].filter(Boolean)}>
          {mode === 'svg' && <p className="dp-note">Solid, linear and radial fills draw as designed here. Angular, diamond and image fills use their first colour on this shape.</p>}
          <FillStack fills={fills} onChange={(f) => set({ fills: f })} />
        </Section>
      )}

      {(
        <Section title="Stroke" badge={badge("stroke")} defaultOpen actions={[resetBtn('stroke')].filter(Boolean)}>
          {d.stroke ? <StrokeEditor stroke={d.stroke} onChange={(s) => set({ stroke: s })} onRemove={() => set({ stroke: isState ? { weight: 0 } : undefined })} />
            : <button type="button" className="cms-btn cms-btn--sm dp-add" onClick={() => set({ stroke: newStroke() })}><Icon name="plus" size={14} /> Add stroke</button>}
        </Section>
      )}

      <Section title="Effects" badge={badge("effects")} defaultOpen actions={[resetBtn('effects')].filter(Boolean)}>
        {(d.effects || []).map((e, i) => <EffectRow key={e.id} e={e} onChange={(n) => set({ effects: d.effects.map((x, k) => (k === i ? n : x)) })} onRemove={() => set({ effects: d.effects.filter((_, k) => k !== i) })} />)}
        <button type="button" className="cms-btn cms-btn--sm dp-add" onClick={() => set({ effects: [...(d.effects || []), newEffect('drop')] })}><Icon name="plus" size={14} /> Add effect</button>
      </Section>

      {!isState && showType && (
        <Section title="Typography" defaultOpen={!!d.type}>
          <Typography t={d.type} fontControl={fontControl} onChange={(t) => set({ type: Object.keys(t).length ? t : undefined })} />
        </Section>
      )}

      {!isState && hasDesign(design) && (
        <p><button type="button" className="cms-btn cms-btn--sm cms-btn--ghost-danger" onClick={() => commit({})}>Reset all design settings</button></p>
      )}
    </div>
  );
}
