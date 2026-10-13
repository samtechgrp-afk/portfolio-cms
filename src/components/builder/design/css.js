import { rgba, hexToRgb } from './color.js';
import { hasDesign, withState } from './model.js';
import { cssUrl } from '../widgets/shared.jsx';

/**
 * Turns a block's `design` into CSS. One pure function so the editor preview and the public site get exactly the same result.
 *
 *   outer  [data-block-id="ID"]  : the flex item / absolutely positioned box (how the block sits inside its parent)
 *   inner  .pbd-ID               : the visible box (size, fills, strokes, effects, states)
 */
export const wrapClass = (id) => `pbd-${String(id).replace(/[^\w-]/g, '_')}`;
const attr = (id) => String(id).replace(/["\\]/g, '');

const num = (v, d = 0) => { const n = Number(v); return v === '' || v === null || v === undefined || Number.isNaN(n) ? d : n; };
/** { v, u } -> '320px' | 'auto' | undefined (not set). */
export function len(x) {
  if (!x || typeof x !== 'object') return undefined;
  if (x.u === 'auto') return 'auto';
  if (x.v === '' || x.v === undefined || x.v === null || Number.isNaN(Number(x.v))) return undefined;
  return `${Number(x.v)}${['px', '%', 'vh', 'vw', 'rem', 'em'].includes(x.u) ? x.u : 'px'}`;
}
const decl = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(';');

/* ---------- fills ---------- */
const stopList = (stops, extra = 100, reverse = false) => {
  const sorted = [...(stops || [])].sort((a, b) => num(a.pos) - num(b.pos));
  const list = sorted.map((s) => ({ ...s, pos: reverse ? 100 - num(s.pos) : num(s.pos) }));
  if (reverse) list.reverse();
  return list.map((s) => `${rgba(s.color, extra)} ${+s.pos.toFixed(2)}%`).join(', ');
};

function fillLayers(fills = []) {
  const layers = [];
  fills.filter((f) => f && f.visible !== false).forEach((f) => {
    const blend = f.blend || 'normal';
    const L = (image, extra = {}) => layers.push({ image, size: 'auto', pos: '0 0', repeat: 'no-repeat', blend, ...extra });
    if (f.type === 'solid') {
      const c = rgba(f.color, f.opacity ?? 100);
      L(`linear-gradient(${c}, ${c})`);
    } else if (f.type === 'linear') {
      L(`linear-gradient(${num(f.angle, 180)}deg, ${stopList(f.stops, f.opacity ?? 100)})`);
    } else if (f.type === 'radial') {
      L(`radial-gradient(ellipse at ${num(f.cx, 50)}% ${num(f.cy, 50)}%, ${stopList(f.stops, f.opacity ?? 100)})`);
    } else if (f.type === 'angular') {
      L(`conic-gradient(from ${num(f.angle, 0)}deg at ${num(f.cx, 50)}% ${num(f.cy, 50)}%, ${stopList(f.stops, f.opacity ?? 100)})`);
    } else if (f.type === 'diamond') {
      // Four quadrant gradients meeting at the centre: the colour changes with |x| + |y|, which draws a diamond.
      const s = stopList(f.stops, f.opacity ?? 100);
      [['to top left', 'left top'], ['to top right', 'right top'], ['to bottom left', 'left bottom'], ['to bottom right', 'right bottom']]
        .forEach(([dir, pos]) => L(`linear-gradient(${dir}, ${s})`, { size: '50.2% 50.2%', pos }));
    } else if (f.type === 'image') {
      const url = cssUrl(f.url);
      if (!url) return;
      const pos = `${num(f.posX, 50)}% ${num(f.posY, 50)}%`;
      if (f.fit === 'tile') L(url, { size: `${Math.max(8, num(f.tile, 200))}px auto`, pos, repeat: 'repeat' });
      else if (f.fit === 'fit') L(url, { size: 'contain', pos });
      else if (f.fit === 'crop') L(url, { size: `${Math.max(10, num(f.scale, 100))}% auto`, pos });
      else L(url, { size: 'cover', pos });
    }
  });
  return layers;
}
function fillDecls(fills) {
  const l = fillLayers(fills);
  if (!l.length) return { 'background-image': 'none' };
  return {
    'background-image': l.map((x) => x.image).join(', '),
    'background-size': l.map((x) => x.size).join(', '),
    'background-position': l.map((x) => x.pos).join(', '),
    'background-repeat': l.map((x) => x.repeat).join(', '),
    'background-blend-mode': l.map((x) => x.blend).join(', '),
  };
}

/* ---------- strokes ---------- */
const sidesAll = (s) => s.t !== false && s.r !== false && s.b !== false && s.l !== false;
const enc = (s) => encodeURIComponent(s).replace(/'/g, '%27');

/** Simple strokes (every side, solid) are box-shadows: they follow the corners exactly. Anything else is drawn by an ::after layer. */
function strokeParts(st, radius) {
  if (!st || num(st.weight) <= 0) return { shadow: [], pseudo: null };
  const w = num(st.weight, 1);
  const col = rgba(st.color);
  const sides = { t: true, r: true, b: true, l: true, ...(st.sides || {}) };
  const simple = sidesAll(sides) && (st.dash || 'solid') === 'solid' && !(st.cap && st.cap !== 'butt') && !(st.join && st.join !== 'miter');
  if (simple) {
    if (st.position === 'outside') return { shadow: [`0 0 0 ${w}px ${col}`], pseudo: null };
    if (st.position === 'center') return { shadow: [`0 0 0 ${w / 2}px ${col}`, `inset 0 0 0 ${w / 2}px ${col}`], pseudo: null };
    return { shadow: [`inset 0 0 0 ${w}px ${col}`], pseudo: null };
  }
  // inset of the drawn layer: the line is centred on the box edge for 'center', half a stroke in for 'inside', half out for 'outside'
  const off = st.position === 'outside' ? w / 2 : st.position === 'center' ? 0 : -w / 2;
  const base = { position: 'absolute', inset: `${-off}px`, 'pointer-events': 'none', 'border-radius': 'inherit', 'box-sizing': 'border-box', content: '""' };
  const dashed = st.dash === 'dashed' || st.dash === 'custom';
  if (!dashed && (!st.cap || st.cap === 'butt') && (!st.join || st.join === 'miter')) {
    // independent sides, solid: a real border on an expanded box
    const grow = st.position === 'outside' ? w : st.position === 'center' ? w / 2 : 0;
    return {
      shadow: [],
      pseudo: {
        ...base, inset: `${-grow}px`, border: '0 solid transparent',
        'border-style': 'solid', 'border-color': col,
        'border-width': `${sides.t ? w : 0}px ${sides.r ? w : 0}px ${sides.b ? w : 0}px ${sides.l ? w : 0}px`,
      },
    };
  }
  // dashed / custom dash / caps / joins: an SVG outline that scales with the box (non-scaling stroke keeps dash lengths in real pixels)
  const dash = st.dash === 'custom' ? `${Math.max(1, num(st.dashLen, 8))} ${Math.max(0, num(st.gap, 6))}` : `${Math.max(1, w * 3)} ${Math.max(1, w * 2)}`;
  const common = `fill='none' stroke='${col}' stroke-width='${w}' stroke-dasharray='${dash}' stroke-linecap='${st.cap || 'butt'}' stroke-linejoin='${st.join || 'miter'}' vector-effect='non-scaling-stroke'`;
  const rx = Math.max(0, num(radius?.mode === 'each' ? radius.tl : radius?.all, 0));
  let shapes;
  if (sidesAll(sides)) shapes = `<rect x='0' y='0' width='100%' height='100%' rx='${rx}' ${common}/>`;
  else {
    const L = [];
    if (sides.t) L.push(`<line x1='0' y1='0' x2='100%' y2='0' ${common}/>`);
    if (sides.b) L.push(`<line x1='0' y1='100%' x2='100%' y2='100%' ${common}/>`);
    if (sides.l) L.push(`<line x1='0' y1='0' x2='0' y2='100%' ${common}/>`);
    if (sides.r) L.push(`<line x1='100%' y1='0' x2='100%' y2='100%' ${common}/>`);
    shapes = L.join('');
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>${shapes}</svg>`;
  return { shadow: [], pseudo: { ...base, 'background-image': `url("data:image/svg+xml,${enc(svg)}")`, 'background-size': '100% 100%', 'background-repeat': 'no-repeat' } };
}

/* ---------- effects ---------- */
function effectParts(effects = []) {
  const shadow = []; let blur = 0; let back = 0;
  effects.filter((e) => e && e.visible !== false).forEach((e) => {
    if (e.type === 'drop') shadow.push(`${num(e.x)}px ${num(e.y)}px ${Math.max(0, num(e.blur))}px ${num(e.spread)}px ${rgba(e.color)}`);
    else if (e.type === 'inner') shadow.push(`inset ${num(e.x)}px ${num(e.y)}px ${Math.max(0, num(e.blur))}px ${num(e.spread)}px ${rgba(e.color)}`);
    else if (e.type === 'layerBlur') blur += Math.max(0, num(e.blur));
    else if (e.type === 'bgBlur') back += Math.max(0, num(e.blur));
  });
  return { shadow, filter: blur ? `blur(${blur}px)` : undefined, backdrop: back ? `blur(${back}px)` : undefined };
}

const radiusCss = (r) => {
  if (!r) return undefined;
  if (r.mode === 'each') return [r.tl, r.tr, r.br, r.bl].map((v) => `${Math.max(0, num(v))}px`).join(' ');
  return r.all === undefined || r.all === '' ? undefined : `${Math.max(0, num(r.all))}px`;
};
const transformCss = (d) => {
  const t = [];
  if (num(d.rot)) t.push(`rotate(${num(d.rot)}deg)`);
  if (d.scale !== undefined && d.scale !== '' && num(d.scale, 100) !== 100) t.push(`scale(${num(d.scale, 100) / 100})`);
  return t.length ? t.join(' ') : undefined;
};

/* ---------- typography ---------- */
const TEXT_EL = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,.pb-btn,.pb-heading,.pb-prose';
const NOT_NESTED = ':not(:is(.pb-slot,.bb-slot) *)';
function typeDecls(t) {
  if (!t) return { wrap: {}, el: {}, p: {} };
  const lh = t.lh || {};
  const ls = t.ls || {};
  const size = t.size && len(t.size) !== 'auto' ? len(t.size) : undefined;
  const el = {
    'font-size': size,
    'font-weight': t.weight || undefined,
    'font-style': t.italic ? 'italic' : undefined,
    'line-height': lh.mode === 'px' ? `${num(lh.v, 24)}px` : lh.mode === 'pct' ? `${num(lh.v, 120) / 100}` : undefined,
    'letter-spacing': ls.v === undefined || ls.v === '' ? undefined : ls.u === '%' ? `${num(ls.v) / 100}em` : `${num(ls.v)}px`,
    'text-align': t.align || undefined,
    'text-decoration': t.deco && t.deco !== 'none' ? t.deco : undefined,
    'text-transform': ({ upper: 'uppercase', lower: 'lowercase', title: 'capitalize' })[t.tcase],
  };
  const wrap = {};
  if (t.valign && t.valign !== 'top') { wrap.display = 'flex'; wrap['flex-direction'] = 'column'; wrap['justify-content'] = t.valign === 'middle' ? 'center' : 'flex-end'; }
  if (t.resize === 'auto-w') { wrap['width'] = 'max-content'; wrap['max-width'] = 'none'; wrap['white-space'] = 'nowrap'; }
  if (t.resize === 'fixed') {
    wrap.overflow = 'hidden';
    const lines = Math.max(0, Math.round(num(t.lines, 0)));
    if (t.truncate && lines === 1) { wrap['white-space'] = 'nowrap'; wrap['text-overflow'] = 'ellipsis'; }
  }
  const p = { 'margin-bottom': t.pSpace === undefined || t.pSpace === '' ? undefined : `${num(t.pSpace)}px`, 'text-indent': t.indent ? `${num(t.indent)}px` : undefined };
  return { wrap, el, p, lines: t.resize === 'fixed' && t.truncate ? Math.max(0, Math.round(num(t.lines, 0))) : 0 };
}

/* ---------- assemble ---------- */
const PREVIEW = { hover: 'hover', active: 'active', focus: 'focus', disabled: 'disabled' };
const STATE_SEL = { hover: ':hover', focus: ':focus-within', active: ':active', disabled: '[data-disabled="true"]' };

/** Paint declarations for a (possibly state-merged) design. `only` limits them to the sections a state overrides. */
function paintDecls(d, only) {
  const out = {}; const pseudo = {};
  const has = (k) => !only || only.includes(k);
  if (has('fills') && (d.fills || only)) Object.assign(out, fillDecls(d.fills));
  const sp = strokeParts(d.stroke, d.radius);
  const ef = effectParts(d.effects);
  if (has('stroke') || has('effects')) {
    const sh = [...sp.shadow, ...ef.shadow];
    if (sh.length || only) out['box-shadow'] = sh.length ? sh.join(', ') : 'none';
  }
  if (has('effects')) { if (ef.filter || only) out.filter = ef.filter || 'none'; if (ef.backdrop || only) { out['backdrop-filter'] = ef.backdrop || 'none'; out['-webkit-backdrop-filter'] = ef.backdrop || 'none'; } }
  if (has('opacity') && d.opacity !== undefined && d.opacity !== '' && (only || num(d.opacity, 100) !== 100)) out.opacity = num(d.opacity, 100) / 100;
  if (has('radius') && radiusCss(d.radius)) out['border-radius'] = radiusCss(d.radius);
  if (has('rot') || has('scale')) { const t = transformCss(d); if (t || only) out.transform = t || 'none'; }
  return { out, pseudo: (has('stroke') && sp.pseudo) || null, clearPseudo: !!only && has('stroke') && !sp.pseudo };
}

export function designCss(id, design, { ownsPaint = false } = {}) {
  if (!hasDesign(design)) return '';
  const d = design;
  const cls = `.${wrapClass(id)}`;
  const outer = `[data-block-id="${attr(id)}"]`;
  const css = [];

  /* geometry (inner) */
  const g = {};
  const w = len(d.w), h = len(d.h);
  g.width = w; g.height = h;
  if (d.lock && num(d.ratio) > 0) { g['aspect-ratio'] = `${num(d.ratio)}`; if (w && w !== 'auto') g.height = 'auto'; else if (h && h !== 'auto') g.width = 'auto'; }
  g['min-width'] = len(d.minW); g['max-width'] = len(d.maxW); g['min-height'] = len(d.minH); g['max-height'] = len(d.maxH);
  const sizeW = d.sizeW, sizeH = d.sizeH;
  if (sizeW === 'fill') g.width = '100%'; else if (sizeW === 'hug') g.width = 'fit-content';
  if (sizeH === 'fill') g.height = '100%'; else if (sizeH === 'hug') g.height = 'fit-content';
  const abs = !!d.abs;
  if (abs && (d.pinH === 'both' || d.pinH === 'scale')) g.width = '100%';
  if (abs && (d.pinV === 'both' || d.pinV === 'scale')) g.height = '100%';
  if (!abs && (num(d.x) || num(d.y))) { g.position = 'relative'; g.left = num(d.x) ? `${num(d.x)}px` : undefined; g.top = num(d.y) ? `${num(d.y)}px` : undefined; }

  /* paint, text */
  const paint = ownsPaint ? { out: {}, pseudo: null } : paintDecls(d);
  if (ownsPaint) {
    const ef = effectParts(d.effects);
    if (ef.filter) paint.out.filter = ef.filter;
    if (num(d.opacity, 100) !== 100) paint.out.opacity = num(d.opacity, 100) / 100;
    const t = transformCss(d); if (t) paint.out.transform = t;
  }
  const radius = ownsPaint ? undefined : radiusCss(d.radius);
  const ty = typeDecls(d.type);
  const layerBlend = d.blend && d.blend !== 'normal' ? d.blend : undefined;
  const hasStates = d.states && Object.keys(d.states).some((k) => hasDesign(d.states[k]));
  const needRel = !!paint.pseudo || !!g.position;
  css.push(`${cls}{${decl({
    'box-sizing': 'border-box', position: needRel ? 'relative' : undefined, ...g, ...ty.wrap,
    'border-radius': radius, overflow: d.clip && !ownsPaint ? 'hidden' : undefined, 'mix-blend-mode': layerBlend,
    ...paint.out, ...(hasStates ? { transition: `all ${Math.max(0, num(d.transition, 160))}ms ease` } : {}),
  })}}`);
  if (paint.pseudo) css.push(`${cls}::after{${decl(paint.pseudo)}}`);
  if (d.smooth > 0 && radius) css.push(`@supports (corner-shape:superellipse(1.5)){${cls},${cls}::after{corner-shape:superellipse(${+(1 + Math.min(100, num(d.smooth)) / 100).toFixed(2)})}}`);
  if (hasStates) css.push(`@media (prefers-reduced-motion:reduce){${cls}{transition:none}}`);

  /* typography on the text inside */
  const elSel = `${cls}.pbd :is(${TEXT_EL})${NOT_NESTED}`;
  const eld = decl(ty.el);
  const inh = decl({ 'text-align': ty.el['text-align'], 'text-transform': ty.el['text-transform'], 'font-style': ty.el['font-style'] });
  if (inh) css.push(`${cls}.pbd{${inh}}`);
  if (eld) css.push(`${elSel}{${eld}}`);
  const pd = decl(ty.p);
  if (pd) css.push(`${cls}.pbd :is(p,li)${NOT_NESTED}{${pd}}`);
  if (ty.lines > 1) css.push(`${cls}.pbd :is(p,.pb-prose,h1,h2,h3,h4,h5,h6)${NOT_NESTED}{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${ty.lines};overflow:hidden}`);
  if (ty.lines === 1) css.push(`${cls}.pbd :is(p,h1,h2,h3,h4,h5,h6,.pb-btn)${NOT_NESTED}{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`);

  /* states */
  ['hover', 'focus', 'active', 'disabled'].forEach((s) => {
    const o = d.states?.[s];
    if (!hasDesign(o)) return;
    const merged = withState(d, s);
    const keys = Object.keys(o).filter((k) => ['fills', 'stroke', 'effects', 'opacity', 'rot', 'scale', 'radius'].includes(k));
    if (!keys.length) return;
    const p = ownsPaint ? { out: {}, pseudo: null } : paintDecls({ ...merged }, keys);
    const sel = `${cls}${STATE_SEL[s]},${cls}[data-preview="${PREVIEW[s]}"]`;
    if (Object.keys(p.out).length) css.push(`${sel}{${decl(p.out)}}`);
    if (p.pseudo) css.push(`${cls}${STATE_SEL[s]}::after,${cls}[data-preview="${PREVIEW[s]}"]::after{${decl(p.pseudo)}}`);
  });

  /* outer: how the block sits in its parent */
  const o = {};
  if (abs) {
    o.position = 'absolute'; o['z-index'] = 2;
    const X = num(d.x), Y = num(d.y); const tr = [];
    const pH = d.pinH || 'left', pV = d.pinV || 'top';
    if (pH === 'left') o.left = `${X}px`; else if (pH === 'right') o.right = `${X}px`; else if (pH === 'both') { o.left = `${X}px`; o.right = `${num(d.x2, X)}px`; }
    else if (pH === 'center') { o.left = `calc(50% + ${X}px)`; tr.push('translateX(-50%)'); } else { o.left = `${X}%`; o.width = `${num(d.w?.v, 100)}%`; }
    if (pV === 'top') o.top = `${Y}px`; else if (pV === 'bottom') o.bottom = `${Y}px`; else if (pV === 'both') { o.top = `${Y}px`; o.bottom = `${num(d.y2, Y)}px`; }
    else if (pV === 'center') { o.top = `calc(50% + ${Y}px)`; tr.push('translateY(-50%)'); } else { o.top = `${Y}%`; o.height = `${num(d.h?.v, 100)}%`; }
    if (tr.length) o.transform = tr.join(' ');
  } else if (d.sizeW === 'fixed' || d.sizeH === 'fixed' || (!d.sizeW && !d.sizeH && (w || h))) {
    o['flex-shrink'] = 0;
  }
  if (Object.keys(o).length) css.push(`${outer}{${decl(o)}}`);
  const pre = (dir) => `.pbf.is-${dir} > .pb-slot > ${outer},.pbf.is-${dir} > .bb-slot > .bb-list > ${outer}`;
  if (!abs) {
    const row = [], col = [];
    if (sizeW === 'fill') { row.push('flex:1 1 0', 'min-width:0'); col.push('align-self:stretch'); }
    if (sizeH === 'fill') { row.push('align-self:stretch'); col.push('flex:1 1 0', 'min-height:0'); }
    if (row.length) css.push(`${pre('row')}{${row.join(';')}}`);
    if (col.length) css.push(`${pre('col')}{${col.join(';')}}`);
  }
  return css.join('\n');
}
