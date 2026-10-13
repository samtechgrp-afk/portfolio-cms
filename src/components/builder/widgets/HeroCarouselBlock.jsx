import { useEffect, useRef, useState } from 'react';
import './HeroCarouselBlock.css';
import { Icon } from '../icons.jsx';
import { LINK_FIELD, LinkWrap, Placeholder, cssUrl, isExternalHref, num, resolveLink } from './shared.jsx';
import { GRADIENT_DEFAULTS, GradientOverlay, gradientFields } from './gradient.jsx';

/**
 * Glassmorphism hero carousel (`hero-carousel`).
 * Clicking a poster thumbnail cross-fades the large background (.banner-bg, 0.6s ease), marks that thumbnail active
 * and shows an animated play icon on it. The active item's link becomes the main call-to-action button.
 */
export function HeroCarousel({ props, editing }) {
  const items = props.items || [];
  const [active, setActive] = useState(0);
  const idx = Math.min(active, Math.max(0, items.length - 1));
  const paused = useRef(false);
  const thumbs = useRef([]);

  useEffect(() => {
    if (!props.autoplay || editing || items.length < 2) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => { if (!paused.current) setActive((i) => (Math.min(i, items.length - 1) + 1) % items.length); }, Math.max(2, num(props.interval, 6)) * 1000);
    return () => clearInterval(t);
  }, [props.autoplay, props.interval, editing, items.length]);

  if (!items.length) return <Placeholder icon="film">Add items in the properties panel.</Placeholder>;

  const onKey = (e) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (idx + dir + items.length) % items.length;
    setActive(next);
    thumbs.current[next]?.focus();
  };

  const current = items[idx];
  const href = resolveLink(current);
  return (
    <section
      className="hc" style={{ '--hc-height': `${num(props.height, 520)}px` }} aria-roledescription="carousel" aria-label={props.label || 'Featured'}
      onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }} onBlur={() => { paused.current = false; }}
    >
      <div className="hc__stage">
        {items.map((it, i) => (
          <div key={i} className={`banner-bg ${i === idx ? 'is-active' : ''}`} style={{ backgroundImage: cssUrl(it.backdropUrl) }} aria-hidden="true" />
        ))}
        <GradientOverlay props={props} />
        <div className="hc__info" aria-live="polite">
          <p className="hc__meta">{current.year && <span>{current.year}</span>}{current.category && <span>{current.category}</span>}</p>
          <h2 className="hc__title">{current.title}</h2>
          {href && <LinkWrap href={href} newTab={isExternalHref(href)} className="pb-btn is-fill is-lg" tabIndex={editing ? -1 : undefined}>{props.ctaLabel || 'Watch now'}</LinkWrap>}
        </div>
      </div>

      <div className="hc__bar" role="group" aria-label="Choose an item" onKeyDown={onKey}>
        {items.map((it, i) => (
          <button
            key={i} type="button" ref={(el) => { thumbs.current[i] = el; }}
            className={`hc__thumb ${i === idx ? 'is-active' : ''}`} aria-current={i === idx ? 'true' : undefined}
            aria-label={[it.title, it.year, it.category].filter(Boolean).join(', ')}
            onClick={() => setActive(i)} tabIndex={editing ? -1 : 0}
          >
            <span className="hc__poster" style={{ backgroundImage: cssUrl(it.posterUrl) }} />
            {i === idx && <span className="hc__play" aria-hidden="true"><Icon name="play" size={16} fill="currentColor" /></span>}
            <span className="hc__thumbtext">
              <strong>{it.title}</strong>
              <span className="hc__tmeta">{it.year && <span>{it.year}</span>}{it.category && <span>{it.category}</span>}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const newItem = { title: 'New title', year: '2026', category: 'Category', backdropUrl: '', posterUrl: '', linkType: 'url', url: '', projectSlug: '', anchor: '' };

export const heroCarouselWidget = {
  type: 'hero-carousel', label: 'Hero Carousel', category: 'media', icon: 'film',
  description: 'A cinematic banner with a glass bar of poster thumbnails that switch the background.',
  defaults: {
    label: 'Featured work', ctaLabel: 'Watch now', height: 520, autoplay: false, interval: 6, ...GRADIENT_DEFAULTS,
    items: [
      { ...newItem, title: 'Featured project', year: '2026', category: 'Motion graphics' },
      { ...newItem, title: 'Second project', year: '2025', category: 'Brand film' },
      { ...newItem, title: 'Third project', year: '2025', category: 'Event' },
    ],
  },
  fields: [
    { key: 'label', label: 'Accessible name', type: 'text', help: 'Read out by screen readers, not shown.' },
    { key: 'ctaLabel', label: 'Button label', type: 'text', help: 'The button uses the active item\u2019s link.' },
    { key: 'height', label: 'Height (px)', type: 'range', min: 320, max: 800, step: 20 },
    ...gradientFields(),
    { key: 'autoplay', label: 'Rotate automatically', type: 'toggle' },
    { key: 'interval', label: 'Seconds per item', type: 'number', min: 2, max: 30, showIf: (p) => p.autoplay },
    {
      key: 'items', label: 'Items', type: 'list', max: 12, newItem, itemLabel: (it, i) => it.title || `Item ${i + 1}`,
      itemFields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'year', label: 'Year', type: 'text' },
        { key: 'category', label: 'Category', type: 'text' },
        { key: 'backdropUrl', label: 'Backdrop image link', type: 'url' },
        { key: 'posterUrl', label: 'Poster image link', type: 'url' },
        { ...LINK_FIELD, label: 'Target link' },
      ],
    },
  ],
  Render: HeroCarousel,
};
