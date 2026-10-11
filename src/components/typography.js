import { useEffect, useReducer } from 'react';

/**
 * Per-project typography.
 *   fontUrl                          stylesheet links, one per line (Google Fonts and similar)
 *   headingFont, bodyFont            CSS font stacks
 *   customFontName, customFontUrl,   one uploaded font file (stored in Supabase Storage) and the
 *   fontFormat                       @font-face format() it needs: truetype | opentype | woff | woff2
 */
export const DEFAULT_TYPOGRAPHY = {
  fontUrl: '', headingFont: 'sans-serif', bodyFont: 'sans-serif',
  customFontName: '', customFontUrl: '', fontFormat: '',
};

/** fontUrl holds one stylesheet link per line. */
export const parseFontUrls = (s = '') => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

const FONT_FILE = /\.(woff2?|ttf|otf|eot)$/i;

/** Returns an error message, or '' when the link is usable as a stylesheet. */
export function checkFontUrl(u) {
  try {
    const url = new URL(u);
    if (url.protocol !== 'https:') return 'Use a secure https:// link.';
    if (FONT_FILE.test(url.pathname))
      return 'This looks like a font file. Paste a stylesheet link instead: a Google Fonts link, or a .css file that declares @font-face.';
    return '';
  } catch {
    return 'Enter a full link starting with https://';
  }
}

// Family stacks end up inside a CSS custom property, so only allow plain font-stack characters.
const SAFE_STACK = /^[\w\s,'"\-.]+$/;
export const isSafeFontStack = (v) => !v || (v.length <= 120 && SAFE_STACK.test(v));
export const safeFontStack = (v, fallback = 'sans-serif') => {
  const t = (v || '').trim();
  return t && isSafeFontStack(t) ? t : fallback;
};

export const typographyStyle = (t) => ({
  '--pb-heading-font': safeFontStack(t?.headingFont),
  '--pb-body-font': safeFontStack(t?.bodyFont),
});

/** Family names found in Google Fonts stylesheet links. */
export function googleFamilies(urls) {
  const names = new Set();
  urls.forEach((u) => {
    try {
      const url = new URL(u);
      if (url.hostname === 'fonts.googleapis.com')
        url.searchParams.getAll('family').forEach((f) => names.add(f.split(':')[0].replace(/\+/g, ' ')));
    } catch { /* ignore */ }
  });
  return [...names];
}

/* ---- <link> injection, shared and reference-counted so the editor, canvas and preview can all ask for it ---- */
const registry = new Map();

function acquire(url, notify) {
  let entry = registry.get(url);
  if (!entry) {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = url;
    el.dataset.cmsFont = '1';
    entry = { el, count: 0, status: 'loading', subs: new Set() };
    const set = (status) => { entry.status = status; entry.subs.forEach((f) => f()); };
    el.onload = () => set('loaded');
    el.onerror = () => set('error');
    registry.set(url, entry);
    document.head.appendChild(el);
  }
  entry.count += 1;
  entry.subs.add(notify);
}

function release(url, notify) {
  const entry = registry.get(url);
  if (!entry) return;
  entry.subs.delete(notify);
  entry.count -= 1;
  if (entry.count <= 0) { entry.el.remove(); registry.delete(url); }
}

/** Injects a <link rel="stylesheet"> into <head> for each valid URL. Returns { [url]: status }. */
export function useFontLinks(urls) {
  const [, rerender] = useReducer((x) => x + 1, 0);
  const key = urls.join('\n');
  useEffect(() => {
    const valid = urls.filter((u) => !checkFontUrl(u));
    valid.forEach((u) => acquire(u, rerender));
    return () => valid.forEach((u) => release(u, rerender));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return Object.fromEntries(urls.map((u) => [u, checkFontUrl(u) ? 'invalid' : registry.get(u)?.status ?? 'loading']));
}


/* ---- custom font files (.ttf, .otf, .woff, .woff2) ---- */

export const FONT_FORMATS = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };
export const FONT_MIME = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
export const FONT_ACCEPT = Object.keys(FONT_FORMATS).map((e) => `.${e}`).join(',');
export const MAX_FONT_BYTES = 5 * 1024 * 1024;

export const fontExtension = (filename = '') => filename.split('.').pop().toLowerCase();

/** Family names are written into CSS, so keep them to plain letters, numbers, spaces, hyphens and underscores. */
export const isSafeFamilyName = (v) => /^[A-Za-z0-9][A-Za-z0-9 _-]{0,59}$/.test(v || '');
export const familyFromFilename = (filename = '') =>
  filename.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9 _-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

const MAGIC = { ttf: ['00010000', '74727565'], otf: ['4f54544f'], woff: ['774f4646'], woff2: ['774f4632'] };

/**
 * Checks extension, size and the file's first four bytes. Returns { ext, format } or throws an Error with a
 * message fit for display. This catches renamed files, not every possible corruption.
 */
export async function inspectFontFile(file) {
  const ext = fontExtension(file.name);
  if (!FONT_FORMATS[ext]) throw new Error('Choose a .ttf, .otf, .woff or .woff2 file.');
  if (file.size > MAX_FONT_BYTES) throw new Error('That font is larger than 5 MB.');
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const hex = [...head].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (!MAGIC[ext].includes(hex)) throw new Error(`This doesn't look like a real .${ext} font file.`);
  return { ext, format: FONT_FORMATS[ext] };
}

const fontFaces = new Map(); // key -> { els, count }
const UNSAFE_URL = /["'()\\;{}<>\s]/;
const FORMAT_MIME = { truetype: 'font/ttf', opentype: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };

export const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
export const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi bold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };

/**
 * Appends an @font-face rule to <head> so a font file can be used by name in CSS, and preloads the file so the
 * text does not jump when it arrives. Rules are shared and reference-counted, and keyed by family, file, weight and
 * style, so re-rendering or switching between dark and light mode never removes or re-adds a font.
 * Returns a function that releases the rule, or null when the input is unusable.
 *
 * injectFontFace(fontName, fontUrl, format, { weight = 400, style = 'normal', preload = true })
 */
export function injectFontFace(fontName, fontUrl, format, { weight = 400, style = 'normal', preload = true } = {}) {
  if (typeof document === 'undefined' || !isSafeFamilyName(fontName) || !Object.values(FONT_FORMATS).includes(format)) return null;
  if (!WEIGHTS.includes(Number(weight)) || !['normal', 'italic'].includes(style)) return null;
  let href;
  try {
    const u = new URL(fontUrl);
    if (u.protocol !== 'https:') return null;
    href = u.href;
  } catch {
    return null;
  }
  if (UNSAFE_URL.test(href)) return null;

  const key = `${fontName}|${href}|${format}|${weight}|${style}`;
  let entry = fontFaces.get(key);
  if (!entry) {
    const els = [];
    if (preload) {
      const link = document.createElement('link');
      link.rel = 'preload'; link.as = 'font'; link.type = FORMAT_MIME[format]; link.href = href; link.crossOrigin = 'anonymous';
      link.dataset.cmsFontPreload = fontName;
      document.head.appendChild(link);
      els.push(link);
    }
    const el = document.createElement('style');
    el.dataset.cmsFontFace = fontName;
    el.textContent = `@font-face{font-family:"${fontName}";src:url("${href}") format("${format}");font-weight:${weight};font-style:${style};font-display:swap;}`;
    document.head.appendChild(el);
    els.push(el);
    entry = { els, count: 0 };
    fontFaces.set(key, entry);
  }
  entry.count += 1;
  return () => {
    entry.count -= 1;
    if (entry.count <= 0) { entry.els.forEach((e) => e.remove()); fontFaces.delete(key); }
  };
}

/** Injects every font record ({ family, fileUrl, format, weight, style }) in the list. Returns one release function. */
export function injectFontFaces(fonts) {
  const releases = fonts.map((f) => injectFontFace(f.family, f.fileUrl, f.format, { weight: f.weight, style: f.style })).filter(Boolean);
  return () => releases.forEach((r) => r());
}

/* ---- which fonts does a page use? ---- */

const quoteStrip = (s) => s.trim().replace(/^["']|["']$/g, '');
/** 'Brand Sans', serif -> ['Brand Sans', 'serif'] */
export const familyList = (stack = '') => stack.split(',').map(quoteStrip).filter(Boolean);
/** Family name -> CSS font stack. */
export const stackFor = (family) => `"${family}", sans-serif`;

const FONT_PROP_KEYS = ['font', 'headlineFont', 'subdeckFont'];
const INLINE_FONT = /\{font:([A-Za-z0-9][A-Za-z0-9 _-]{0,59})\}/g;

/** Lower-cased family names used by the project typography and by any block (including nested ones and inline {font:Name} text). */
export function collectUsedFamilies(blocks = [], typography = {}) {
  const used = new Set();
  const add = (stack) => familyList(stack).forEach((f) => used.add(f.toLowerCase()));
  add(typography?.headingFont);
  add(typography?.bodyFont);
  const walk = (list) => list.forEach((b) => {
    const p = b.props || {};
    FONT_PROP_KEYS.forEach((k) => { if (p[k] && p[k] !== 'heading' && p[k] !== 'body') add(p[k]); });
    ['content', 'text', 'quote'].forEach((k) => { if (typeof p[k] === 'string') for (const m of p[k].matchAll(INLINE_FONT)) used.add(m[1].toLowerCase()); });
    Object.values(p.slots || {}).forEach(walk);
  });
  walk(blocks);
  return used;
}

/** CSS rules for a block-level font choice: a family name, 'heading', 'body' or ''. */
export function fontScopeStyle(font) {
  if (!font) return null;
  if (font === 'heading') return { fontFamily: 'var(--pb-heading-font)', '--pb-body-font': 'var(--pb-heading-font)' };
  if (font === 'body') return { fontFamily: 'var(--pb-body-font)', '--pb-heading-font': 'var(--pb-body-font)' };
  if (!isSafeFamilyName(font)) return null;
  const stack = stackFor(font);
  return { fontFamily: stack, '--pb-heading-font': stack, '--pb-body-font': stack };
}

/** "Brand-Sans-BoldItalic.ttf" -> { weight: 700, style: 'italic' } (a starting guess the user can change). */
export function guessWeightStyle(filename = '') {
  const n = filename.toLowerCase();
  const rules = [[/thin|hairline/, 100], [/extra-?light|ultra-?light/, 200], [/light/, 300], [/semi-?bold|demi-?bold/, 600], [/extra-?bold|ultra-?bold/, 800], [/black|heavy/, 900], [/bold/, 700], [/medium/, 500]];
  const hit = rules.find(([re]) => re.test(n));
  return { weight: hit ? hit[1] : 400, style: /italic|oblique/.test(n) ? 'italic' : 'normal' };
}

/** "Brand-Sans-BoldItalic.ttf" -> "Brand Sans" */
export function guessFamily(filename = '') {
  const base = familyFromFilename(filename)
    .replace(/\b(thin|hairline|extra ?light|ultra ?light|light|regular|book|normal|medium|semi ?bold|demi ?bold|extra ?bold|ultra ?bold|bold|black|heavy|italic|oblique)+\b/gi, ' ')
    .replace(/(bold|italic|regular|light|medium|black|thin)+$/i, '')
    .replace(/[ _-]+/g, ' ').trim();
  return (base || familyFromFilename(filename)).slice(0, 60);
}

/** Injects the project's uploaded font, if it has one. */
export function useCustomFont(typography) {
  const { customFontName, customFontUrl, fontFormat } = typography || {};
  useEffect(() => injectFontFace(customFontName, customFontUrl, fontFormat) || undefined, [customFontName, customFontUrl, fontFormat]);
}

/** Injects the library fonts a page actually uses. `fonts` is the whole library; unused families are skipped. */
export function useFontFaces(fonts, blocks, typography) {
  const used = collectUsedFamilies(blocks, typography);
  const faces = (fonts || []).filter((f) => used.has(f.family.toLowerCase()));
  const key = faces.map((f) => `${f.family}|${f.fileUrl}|${f.weight}|${f.style}`).sort().join('\n');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => injectFontFaces(faces), [key]);
}

/**
 * Everything a page needs to show its fonts: stylesheet links, the (legacy) single uploaded font, and the library
 * fonts that its blocks use. Returns the link statuses.
 */
export function useTypographyAssets(typography, { fonts = [], blocks = [] } = {}) {
  const statuses = useFontLinks(parseFontUrls(typography?.fontUrl));
  useCustomFont(typography);
  useFontFaces(fonts, blocks, typography);
  return statuses;
}
