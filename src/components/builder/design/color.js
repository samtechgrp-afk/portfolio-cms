/** Colour helpers. Colours are stored as { c: '#rrggbb', a: 0-100 } so alpha is separate from the hex. */
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const HEX6 = /^#([0-9a-f]{6})$/i;

export const hexOk = (s) => HEX6.test((s || '').trim());
export const fixHex = (s, d = '#000000') => {
  const t = (s || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(t)) return `#${[...t.slice(1)].map((x) => x + x).join('')}`.toLowerCase();
  return hexOk(t) ? t.toLowerCase() : d;
};

export function hexToRgb(hex) {
  const n = parseInt(fixHex(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r, g, b) => `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;

export function rgbToHsl(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6; else if (max === G) h = (B - R) / d + 2; else h = (R - G) / d + 4;
  }
  const l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [Math.round(((h * 60) + 360) % 360), Math.round(s * 100), Math.round(l * 100)];
}
export function hslToRgb(h, s, l) {
  const S = clamp(s, 0, 100) / 100, L = clamp(l, 0, 100) / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255].map(Math.round);
}

/** Text for the colour field in the chosen format. */
export function formatColor(c, format = 'hex') {
  const [r, g, b] = hexToRgb(c);
  if (format === 'rgb') return `${r}, ${g}, ${b}`;
  if (format === 'hsl') { const [h, s, l] = rgbToHsl(r, g, b); return `${h}, ${s}%, ${l}%`; }
  return fixHex(c);
}
/** Reads what the person typed (hex, "r, g, b" or "h, s%, l%"). Returns a hex colour or null. */
export function parseColor(text, format = 'hex') {
  const t = (text || '').trim();
  if (format === 'hex') { const h = t.startsWith('#') ? t : `#${t}`; return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h) ? fixHex(h) : null; }
  const parts = t.replace(/[a-z()%]/gi, ' ').split(/[\s,]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  if (format === 'rgb') return rgbToHex(...parts.slice(0, 3));
  return rgbToHex(...hslToRgb(parts[0], parts[1], parts[2]));
}

/** { c, a } (+ extra opacity 0-100) -> 'rgba(r, g, b, alpha)'. */
export function rgba(col, extra = 100) {
  const c = typeof col === 'string' ? { c: col, a: 100 } : col || {};
  const [r, g, b] = hexToRgb(c.c);
  const a = clamp((Number.isFinite(Number(c.a)) ? Number(c.a) : 100) / 100 * (clamp(Number(extra), 0, 100) / 100), 0, 1);
  return `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})`;
}
