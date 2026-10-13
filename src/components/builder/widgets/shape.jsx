import { useId } from 'react';
import { rgba } from '../design/color.js';
import { num } from './shared.jsx';

/* ---------- geometry ---------- */
/** Points of a regular polygon or a star inside a 100 x 100 box (an ellipse touching all four sides, as in Figma). */
export function shapePoints(kind, sides, inner) {
  const n = Math.max(3, Math.min(60, Math.round(num(sides, kind === 'star' ? 5 : 6))));
  const ratio = Math.max(0.05, Math.min(0.95, num(inner, 50) / 100));
  const pts = [];
  const total = kind === 'star' ? n * 2 : n;
  for (let i = 0; i < total; i += 1) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / total;
    const r = kind === 'star' && i % 2 === 1 ? 50 * ratio : 50;
    pts.push([+(50 + r * Math.cos(a)).toFixed(3), +(50 + r * Math.sin(a)).toFixed(3)]);
  }
  return pts;
}
const pathOf = (pts) => `M ${pts.map((p) => p.join(' ')).join(' L ')} Z`;

/* ---------- svg paint (polygon, star) ---------- */
function Paints({ fills, uid }) {
  const defs = []; const layers = [];
  (fills || []).filter((f) => f.visible !== false).forEach((f, i) => {
    const key = `${uid}f${i}`;
    let fill;
    if (f.type === 'linear' || f.type === 'radial') {
      const a = (num(f.angle, 180) * Math.PI) / 180, sx = Math.sin(a) / 2, sy = -Math.cos(a) / 2;
      const stops = [...(f.stops || [])].sort((x, y) => x.pos - y.pos).map((s) => (
        <stop key={s.id} offset={`${s.pos}%`} stopColor={s.color.c} stopOpacity={(num(s.color.a, 100) / 100) * (num(f.opacity, 100) / 100)} />
      ));
      defs.push(f.type === 'linear'
        ? <linearGradient key={key} id={key} x1={0.5 - sx} y1={0.5 - sy} x2={0.5 + sx} y2={0.5 + sy}>{stops}</linearGradient>
        : <radialGradient key={key} id={key} cx={num(f.cx, 50) / 100} cy={num(f.cy, 50) / 100} r="0.7">{stops}</radialGradient>);
      fill = `url(#${key})`;
    } else if (f.type === 'solid') fill = rgba(f.color, f.opacity ?? 100);
    else if (f.stops?.length) fill = rgba(f.stops[0].color, f.opacity ?? 100); // angular, diamond: use the first colour
    else return;
    layers.push({ fill, blend: f.blend, key });
  });
  return { defs, layers };
}

function SvgShape({ props }) {
  const uid = `s${useId().replace(/:/g, '')}`;
  const d = props.design || {};
  const pts = shapePoints(props.kind, props.sides, props.inner);
  const path = pathOf(pts);
  const { defs, layers } = Paints({ fills: d.fills, uid });
  const st = d.stroke && num(d.stroke.weight) > 0 ? d.stroke : null;
  const w = st ? num(st.weight, 1) : 0;
  const pos = st?.position || 'inside';
  const dash = st && st.dash !== 'solid' && st.dash ? (st.dash === 'custom' ? `${Math.max(1, num(st.dashLen, 8))} ${Math.max(0, num(st.gap, 6))}` : `${Math.max(1, w * 3)} ${Math.max(1, w * 2)}`) : undefined;
  const strokeProps = st ? {
    fill: 'none', stroke: rgba(st.color), strokeWidth: pos === 'center' ? w : w * 2, strokeDasharray: dash, strokeLinecap: st.cap || 'butt', strokeLinejoin: st.join || 'miter', vectorEffect: 'non-scaling-stroke',
  } : null;
  const clipId = `${uid}c`, maskId = `${uid}m`;
  return (
    <svg className="pb-shape pb-shape--svg" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={props.label || props.kind} overflow="visible">
      <defs>
        {defs}
        {st && pos === 'inside' && <clipPath id={clipId}><path d={path} /></clipPath>}
        {st && pos === 'outside' && <mask id={maskId} maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200"><rect x="-50" y="-50" width="200" height="200" fill="#fff" /><path d={path} fill="#000" /></mask>}
      </defs>
      {layers.map((l) => <path key={l.key} d={path} fill={l.fill} style={l.blend && l.blend !== 'normal' ? { mixBlendMode: l.blend } : undefined} />)}
      {strokeProps && <path d={path} {...strokeProps} clipPath={pos === 'inside' ? `url(#${clipId})` : undefined} mask={pos === 'outside' ? `url(#${maskId})` : undefined} />}
    </svg>
  );
}

/* ---------- line and arrow ---------- */
export const CAPS = [['flat', 'Flat'], ['round', 'Round'], ['square', 'Square'], ['arrow', 'Arrow'], ['triangle', 'Triangle'], ['diamond', 'Diamond'], ['circle', 'Circle']];
function Cap({ type, size, color, flip }) {
  if (!type || type === 'flat') return null;
  const s = (type === 'round' || type === 'square') ? size : Math.max(12, size * 3.2);
  const style = { width: s, height: s, flex: 'none', transform: flip ? 'scaleX(-1)' : undefined, marginLeft: flip ? -s / 2 + 0 : undefined };
  const common = { viewBox: '0 0 10 10', width: s, height: s, style, 'aria-hidden': true, focusable: 'false' };
  if (type === 'arrow') return <svg {...common}><path d="M2 1 L8.5 5 L2 9" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === 'triangle') return <svg {...common}><path d="M1 1 L9.5 5 L1 9 Z" fill={color} /></svg>;
  if (type === 'diamond') return <svg {...common}><path d="M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z" fill={color} /></svg>;
  if (type === 'circle' || type === 'round') return <svg {...common}><circle cx="5" cy="5" r={type === 'round' ? 5 : 4.2} fill={color} /></svg>;
  return <svg {...common}><rect x="0" y="0" width="10" height="10" fill={color} /></svg>;
}
function Line({ props }) {
  const st = props.design?.stroke;
  const w = Math.max(1, num(st?.weight, 4));
  const color = st ? rgba(st.color) : '#101114';
  const dashed = st?.dash === 'dashed' || st?.dash === 'custom';
  const dashLen = st?.dash === 'custom' ? Math.max(1, num(st.dashLen, 8)) : w * 3;
  const gap = st?.dash === 'custom' ? Math.max(0, num(st.gap, 6)) : w * 2;
  const bar = dashed
    ? { backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 ${dashLen}px, transparent ${dashLen}px ${dashLen + gap}px)` }
    : { background: color };
  return (
    <div className="pb-line" role="img" aria-label={props.label || 'Line'}>
      <Cap type={props.startCap} size={w} color={color} flip />
      <span className="pb-line__bar" style={{ height: w, ...bar }} />
      <Cap type={props.endCap} size={w} color={color} />
    </div>
  );
}

function Shape({ props }) {
  if (props.kind === 'polygon' || props.kind === 'star') return <SvgShape props={props} />;
  if (props.kind === 'line') return <Line props={props} />;
  return <div className={`pb-shape pb-shape--${props.kind}`} role="img" aria-label={props.label || props.kind} />;
}

const solid = (c) => [{ id: 'f0', type: 'solid', visible: true, opacity: 100, blend: 'normal', color: { c, a: 100 } }];
const SIZE = (w, h) => ({ w: { v: w, u: 'px' }, h: { v: h, u: 'px' } });
const R = (n) => ({ mode: 'uniform', all: n, tl: n, tr: n, br: n, bl: n });
const labelField = { key: 'label', label: 'Description for screen readers', type: 'text', help: 'Leave empty if the shape is only decoration.' };
const common = { category: 'shapes', Render: Shape, paintMode: (p) => (p.kind === 'ellipse' ? 'ellipse' : p.kind === 'polygon' || p.kind === 'star' ? 'svg' : p.kind === 'line' ? 'line' : 'css') };

export const shapeWidgets = [
  { ...common, type: 'rect', label: 'Rectangle', icon: 'box', description: 'A rectangle with independent corner radius and corner smoothing.',
    defaults: { kind: 'rect', label: '', design: { ...SIZE(240, 140), radius: R(16), fills: solid('#0057ff') } }, fields: [labelField] },
  { ...common, type: 'ellipse', label: 'Ellipse', icon: 'circle', description: 'A circle or ellipse. Set width and height to change the shape.',
    defaults: { kind: 'ellipse', label: '', design: { ...SIZE(160, 160), fills: solid('#ff5a36') } }, fields: [labelField] },
  { ...common, type: 'polygon', label: 'Polygon', icon: 'hexagon', description: 'A regular polygon with 3 to 60 sides.',
    defaults: { kind: 'polygon', sides: 6, label: '', design: { ...SIZE(160, 160), fills: solid('#7b2ff7') } },
    fields: [{ key: 'sides', label: 'Number of sides', type: 'range', min: 3, max: 24, step: 1 }, labelField] },
  { ...common, type: 'star', label: 'Star', icon: 'star', description: 'A star with a point count and an inner radius.',
    defaults: { kind: 'star', sides: 5, inner: 40, label: '', design: { ...SIZE(160, 160), fills: solid('#f5b800') } },
    fields: [{ key: 'sides', label: 'Number of points', type: 'range', min: 3, max: 24, step: 1 }, { key: 'inner', label: 'Inner radius', type: 'range', min: 5, max: 95, step: 1, unit: '%' }, labelField] },
  { ...common, type: 'line', label: 'Line & Arrow', icon: 'minus', description: 'A line with start and end caps: flat, round, square, arrow, triangle, diamond or circle.',
    defaults: { kind: 'line', startCap: 'flat', endCap: 'arrow', label: '', design: { w: { v: 100, u: '%' }, stroke: { color: { c: '#101114', a: 100 }, weight: 4, position: 'center', sides: { t: true, r: true, b: true, l: true }, dash: 'solid', dashLen: 8, gap: 6, cap: 'butt', join: 'miter' } } },
    fields: [
      { key: 'startCap', label: 'Start cap', type: 'select', options: CAPS },
      { key: 'endCap', label: 'End cap', type: 'select', options: CAPS },
      labelField,
    ] },
];
