import { useEffect } from 'react';

/**
 * Site icon (favicon) helper, shared by the CMS and the public site.
 * applySiteIcon(url) points the page's icon links at the chosen image, or back at the default one when there is none.
 * The last icon is remembered in this browser so it can be applied before the network answers.
 */
const CACHE_KEY = 'site-icon-url';
const TYPES = { ico: 'image/x-icon', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

/** Only web and site-relative links may become the icon. */
export const safeIconUrl = (u) => {
  const t = (u || '').trim();
  return /^(https?:\/\/|\/(?!\/))/i.test(t) && !/["'<>\s]/.test(t) ? t : '';
};
export const iconMime = (u) => TYPES[((u || '').split(/[?#]/)[0].split('.').pop() || '').toLowerCase()] || '';

function link(rel) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
  return el;
}

export function applySiteIcon(url, { remember = true } = {}) {
  if (typeof document === 'undefined') return;
  const good = safeIconUrl(url);
  const icon = link('icon');
  const apple = link('apple-touch-icon');
  if (!icon.dataset.defaultHref) { icon.dataset.defaultHref = icon.getAttribute('href') || '/favicon.svg'; icon.dataset.defaultType = icon.getAttribute('type') || 'image/svg+xml'; }
  if (!apple.dataset.defaultHref) apple.dataset.defaultHref = apple.getAttribute('href') || '/apple-touch-icon.png';
  const mime = good ? iconMime(good) : icon.dataset.defaultType;
  icon.setAttribute('href', good || icon.dataset.defaultHref);
  if (mime) icon.setAttribute('type', mime); else icon.removeAttribute('type');
  apple.setAttribute('href', good || apple.dataset.defaultHref);
  if (remember) { try { good ? localStorage.setItem(CACHE_KEY, good) : localStorage.removeItem(CACHE_KEY); } catch { /* storage blocked: fine */ } }
}

export function cachedSiteIcon() {
  try { return localStorage.getItem(CACHE_KEY) || ''; } catch { return ''; }
}

/** Keeps the page icon in sync with `url`. `undefined` means "not loaded yet": leave the icon alone. */
export function useSiteIcon(url) {
  useEffect(() => { if (url !== undefined) applySiteIcon(url); }, [url]);
}
