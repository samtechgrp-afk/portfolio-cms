import { useEffect, useReducer } from 'react';

export const DEFAULT_TYPOGRAPHY = { fontUrl: '', headingFont: 'sans-serif', bodyFont: 'sans-serif' };

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
