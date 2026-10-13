/**
 * The universal "design" model. Every block can carry props.design; anything missing means "leave the block as it is".
 * Kept as plain JSON so it saves with the block, duplicates with it, and renders identically in the editor and on the site.
 */
export const UNITS = ['px', '%', 'vh', 'vw', 'auto'];
export const BLEND_MODES = [
  ['normal', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['darken', 'Darken'], ['lighten', 'Lighten'],
  ['color-dodge', 'Color Dodge'], ['color-burn', 'Color Burn'], ['difference', 'Difference'], ['exclusion', 'Exclusion'],
  ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Color'], ['luminosity', 'Luminosity'],
];
export const STATES = [['default', 'Default'], ['hover', 'Hover'], ['active', 'Active / Pressed'], ['focus', 'Focus'], ['disabled', 'Disabled']];
/** Sections a state can override. */
export const STATE_KEYS = ['fills', 'stroke', 'effects', 'opacity', 'rot', 'scale', 'radius'];

let n = 0;
export const newId = () => `${Date.now().toString(36)}${(n++).toString(36)}`;

export const newSolid = (c = '#d9dde6') => ({ id: newId(), type: 'solid', visible: true, opacity: 100, blend: 'normal', color: { c, a: 100 } });
export const newGradient = (type = 'linear') => ({
  id: newId(), type, visible: true, opacity: 100, blend: 'normal', angle: type === 'angular' ? 0 : 180, cx: 50, cy: 50,
  stops: [{ id: newId(), pos: 0, color: { c: '#0057ff', a: 100 } }, { id: newId(), pos: 100, color: { c: '#7b2ff7', a: 100 } }],
});
export const newImageFill = () => ({ id: newId(), type: 'image', visible: true, opacity: 100, blend: 'normal', url: '', fit: 'fill', scale: 100, posX: 50, posY: 50 });
export const newStroke = () => ({ color: { c: '#101114', a: 100 }, weight: 2, position: 'inside', sides: { t: true, r: true, b: true, l: true }, dash: 'solid', dashLen: 8, gap: 6, cap: 'butt', join: 'miter' });
export const newEffect = (type = 'drop') => ({
  id: newId(), type, visible: true,
  ...(type === 'drop' || type === 'inner' ? { x: 0, y: 8, blur: 24, spread: 0, color: { c: '#000000', a: 25 } } : { blur: 12 }),
});

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
/** True when the design would change anything about how the block renders. */
export function hasDesign(d) {
  if (!isObj(d)) return false;
  return Object.keys(d).some((k) => {
    const v = d[k];
    if (v === undefined || v === null || v === '' || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (isObj(v)) return Object.keys(v).length > 0 && (k !== 'states' || Object.values(v).some((s) => hasDesign(s)));
    return true;
  });
}

/** Merge a state's overrides over the base design, section by section. */
export const withState = (design, state) => (state && state !== 'default' && design.states?.[state] ? { ...design, ...design.states[state] } : design);
