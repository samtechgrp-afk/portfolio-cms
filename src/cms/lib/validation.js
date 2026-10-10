import { checkFontUrl, isSafeFontStack, parseFontUrls } from '../../components/typography.js';

export const STATUSES = ['draft', 'published'];

export const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Returns { field: message }. Empty object means valid. Typography errors use "typography.<field>" keys.
 * `all` is the full project list, used to keep slugs unique.
 */
export function validateProject(p, all = []) {
  const errors = {};
  const title = p.title.trim();

  if (!title) errors.title = 'Add a title.';
  else if (title.length > 120) errors.title = 'Keep the title under 120 characters.';

  if (!p.slug) errors.slug = 'Add a slug. It becomes the project URL.';
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens only.';
  else if (all.some((o) => o.slug === p.slug && o.id !== p.id)) errors.slug = 'Another project already uses this slug.';

  if (p.summary.length > 200) errors.summary = 'Keep the summary under 200 characters.';

  if (p.categories.length > 8) errors.categories = 'Use 8 categories or fewer.';
  else if (p.categories.some((c) => c.length > 30)) errors.categories = 'Each category must be 30 characters or fewer.';

  if (p.coverUrl && !isHttpUrl(p.coverUrl)) errors.coverUrl = 'Enter a full link starting with https://';
  if (p.liveUrl && !isHttpUrl(p.liveUrl)) errors.liveUrl = 'Enter a full link starting with https://';

  if (!STATUSES.includes(p.status)) errors.status = 'Choose draft or published.';
  if (!p.createdAt || Number.isNaN(Date.parse(p.createdAt))) errors.createdAt = 'Pick a valid date.';

  const urls = parseFontUrls(p.typography?.fontUrl);
  if (urls.length > 6) errors['typography.fontUrl'] = 'Use 6 stylesheet links or fewer.';
  else {
    const bad = urls.findIndex((u) => checkFontUrl(u));
    if (bad !== -1) errors['typography.fontUrl'] = `Link ${bad + 1}: ${checkFontUrl(urls[bad])}`;
  }
  ['headingFont', 'bodyFont'].forEach((k) => {
    if (!isSafeFontStack(p.typography?.[k])) errors[`typography.${k}`] = 'Use letters, numbers, spaces, commas, quotes and hyphens only (max 120 characters).';
  });

  return errors;
}
