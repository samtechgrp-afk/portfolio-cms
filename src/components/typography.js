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

const fontFaces = new Map(); // key -> { el, count }
const UNSAFE_URL = /["'()\\;{}<>\s]/;

/**
 * Appends an @font-face rule to <head> so a font file can be used by name in CSS.
 * Returns a function that releases it (rules are shared and reference-counted). Returns null when the input is unusable.
 */
export function injectFontFace(fontName, fontUrl, format) {
  if (typeof document === 'undefined' || !isSafeFamilyName(fontName) || !Object.values(FONT_FORMATS).includes(format)) return null;
  let href;
  try {
    const u = new URL(fontUrl);
    if (u.protocol !== 'https:') return null;
    href = u.href;
  } catch {
    return null;
  }
  if (UNSAFE_URL.test(href)) return null;

  const key = `${fontName}|${href}|${format}`;
  let entry = fontFaces.get(key);
  if (!entry) {
    const el = document.createElement('style');
    el.dataset.cmsFontFace = fontName;
    el.textContent = `@font-face{font-family:"${fontName}";src:url("${href}") format("${format}");font-display:swap;}`;
    document.head.appendChild(el);
    entry = { el, count: 0 };
    fontFaces.set(key, entry);
  }
  entry.count += 1;
  return () => {
    entry.count -= 1;
    if (entry.count <= 0) { entry.el.remove(); fontFaces.delete(key); }
  };
}

/** Injects the project's uploaded font, if it has one. */
export function useCustomFont(typography) {
  const { customFontName, customFontUrl, fontFormat } = typography || {};
  useEffect(() => injectFontFace(customFontName, customFontUrl, fontFormat) || undefined, [customFontName, customFontUrl, fontFormat]);
}

/** Everything a page needs to show its fonts: stylesheet links plus the uploaded font. Returns link statuses. */
export function useTypographyAssets(typography) {
  const statuses = useFontLinks(parseFontUrls(typography?.fontUrl));
  useCustomFont(typography);
  return statuses;
}
