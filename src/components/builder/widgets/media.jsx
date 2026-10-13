import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons.jsx';
import { ALIGN, LinkWrap, Placeholder, SandboxFrame, lightboxUrl, num, opts } from './shared.jsx';

/** Turns a pasted video link into something embeddable. */
export function toVideoEmbed(raw) {
  let url;
  try { url = new URL((raw || '').trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}` };
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];
    return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.match(/\/(\d+)/)?.[1];
    return id ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1];
    return id ? { kind: 'iframe', src: `https://drive.google.com/file/d/${id}/preview` } : null;
  }
  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { kind: 'file', src: url.href };
  return { kind: 'iframe', src: url.href };
}

const driveId = (src) => src.match(/\/file\/d\/([\w-]+)/)?.[1];

/** A still image to show before the video loads: a custom poster, a Drive thumbnail, or a YouTube thumbnail. */
function posterFor(props, embed) {
  if (/^https?:\/\//i.test(props.poster || '')) return props.poster;
  if (embed.kind !== 'iframe') return '';
  const drive = driveId(embed.src);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive}&sz=w1400`;
  const yt = embed.src.match(/youtube-nocookie\.com\/embed\/([\w-]+)/)?.[1];
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '';
}

function Video({ props, editing }) {
  const [playing, setPlaying] = useState(false);
  const ratio = props.aspect || '16/9';
  if (props.mode === 'html') {
    return props.code?.trim()
      ? <div className="pb-media" style={{ aspectRatio: ratio }}><SandboxFrame code={props.code} height="100%" title="Embedded video" /></div>
      : <Placeholder icon="video">Paste your embed code in the properties panel.</Placeholder>;
  }
  const embed = toVideoEmbed(props.url);
  if (!embed) return <Placeholder icon="video">Add a YouTube, Vimeo, Google Drive or .mp4 link.</Placeholder>;
  const poster = props.facade ? posterFor(props, embed) : '';
  const facade = embed.kind === 'iframe' && poster && !playing;
  const src = playing && /youtube-nocookie/.test(embed.src) ? `${embed.src}?autoplay=1` : embed.src;
  return (
    <div className="pb-media" style={{ aspectRatio: ratio }}>
      {facade ? (
        <button type="button" className="pb-facade" aria-label={`Play video${props.caption ? `: ${props.caption}` : ''}`} onClick={() => setPlaying(true)} tabIndex={editing ? -1 : 0}>
          <img src={poster} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.remove()} />
          <span className="pb-facade__play"><Icon name="play" size={26} fill="currentColor" /></span>
          {props.caption && <span className="pb-facade__cap">{props.caption}</span>}
        </button>
      ) : embed.kind === 'file' ? (
        <video src={embed.src} controls preload="metadata" />
      ) : (
        <iframe src={src} title={props.caption || 'Video'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
      )}
    </div>
  );
}

const RATIOS = [['auto', 'Original'], ['1/1', 'Square'], ['4/3', '4:3'], ['3/2', '3:2'], ['16/9', '16:9']];
const imageItem = { url: '', alt: '' };
const imageFields = [{ key: 'url', label: 'Image link', type: 'url' }, { key: 'alt', label: 'Description (alt text)', type: 'text' }];

function Tile({ item, ratio }) {
  return item.url
    ? <img src={item.url} alt={item.alt || ''} loading="lazy" referrerPolicy="no-referrer" style={ratio !== 'auto' ? { aspectRatio: ratio } : undefined} />
    : <div className="pb-tile-empty" style={{ aspectRatio: ratio === 'auto' ? '4/3' : ratio }}><Icon name="image" size={22} /></div>;
}


function Gallery({ props }) {
  const items = props.images || [];
  const shown = items.map((it, i) => ({ ...it, i })).filter((it) => it.url); // images that can be opened
  const [open, setOpen] = useState(null); // index into `shown`
  const dialog = useRef(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (dir) => setOpen((o) => (o + dir + shown.length) % shown.length);
  const current = open !== null ? shown[open] : null;

  return (
    <>
      <div className={`pb-gallery pb-gap-${props.gap} ${props.layout === 'masonry' ? 'is-masonry' : ''}`} style={{ '--cols': num(props.columns, 3) }}>
        {items.map((it, i) => {
          const pos = shown.findIndex((x) => x.i === i);
          return (
            <figure className="pb-gallery__item" key={i}>
              {props.lightbox && it.url ? (
                <button type="button" className="pb-gallery__open" onClick={() => setOpen(pos)} aria-label={`View ${it.caption || it.alt || `image ${i + 1}`} larger`}>
                  <Tile item={it} ratio={props.ratio} />
                </button>
              ) : <Tile item={it} ratio={props.ratio} />}
              {props.showCaptions && it.caption && <figcaption>{it.caption}</figcaption>}
            </figure>
          );
        })}
      </div>
      {props.lightbox && (
        <dialog
          ref={dialog} className="pb-lightbox" aria-label="Image viewer" onClose={() => setOpen(null)}
          onClick={(e) => { if (e.target === dialog.current) setOpen(null); }}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); }}
        >
          {current && (
            <figure>
              <img src={lightboxUrl(current.url)} alt={current.alt || ''} referrerPolicy="no-referrer" />
              {(current.caption || current.alt) && <figcaption>{current.caption || current.alt}</figcaption>}
            </figure>
          )}
          <button type="button" className="pb-lightbox__x" aria-label="Close" onClick={() => setOpen(null)}><Icon name="x" size={22} /></button>
          {shown.length > 1 && (
            <>
              <button type="button" className="pb-lightbox__nav is-prev" aria-label="Previous image" onClick={() => step(-1)}><Icon name="chevron-left" size={26} /></button>
              <button type="button" className="pb-lightbox__nav is-next" aria-label="Next image" onClick={() => step(1)}><Icon name="chevron-right" size={26} /></button>
            </>
          )}
        </dialog>
      )}
    </>
  );
}

function Carousel({ props, editing }) {
  const slides = (props.images || []).length ? props.images : [imageItem];
  const n = slides.length;
  const mode = props.mode;
  const perView = mode === 'carousel' ? Math.max(1, Math.min(num(props.perView, 3), n)) : 1;
  const max = mode === 'slideshow' ? n - 1 : Math.max(0, n - perView);
  const [i, setI] = useState(0);
  const idx = Math.min(i, max);
  const go = (d) => setI((x) => { const v = Math.min(x, max) + d; return v > max ? 0 : v < 0 ? max : v; });

  useEffect(() => {
    if (!props.autoplay || editing || n < 2) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => go(1), Math.max(1, num(props.interval, 4)) * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.autoplay, props.interval, editing, n, max]);

  const ratio = props.ratio || '16/9';
  return (
    <div className={`pb-carousel is-${mode}`} role="region" aria-roledescription="carousel" aria-label="Image carousel">
      <div className="pb-carousel__viewport">
        {mode === 'slideshow' ? (
          slides.map((s, k) => (
            <figure key={k} className={`pb-slide ${k === idx ? 'is-active' : ''}`} aria-hidden={k !== idx} style={{ aspectRatio: ratio }}>
              <Tile item={s} ratio="auto" />
              {s.caption && <figcaption>{s.caption}</figcaption>}
            </figure>
          ))
        ) : (
          <div className="pb-track" style={{ transform: `translateX(-${idx * (100 / perView)}%)` }}>
            {slides.map((s, k) => (
              <figure key={k} className="pb-slide" style={{ flex: `0 0 ${100 / perView}%`, aspectRatio: mode === 'slider' ? ratio : undefined }}>
                <Tile item={s} ratio={mode === 'slider' ? 'auto' : ratio} />
                {s.caption && <figcaption>{s.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
        {props.arrows && max > 0 && (
          <>
            <button type="button" className="pb-arrow is-prev" aria-label="Previous slide" onClick={() => go(-1)} tabIndex={editing ? -1 : 0}><Icon name="chevron-left" size={22} /></button>
            <button type="button" className="pb-arrow is-next" aria-label="Next slide" onClick={() => go(1)} tabIndex={editing ? -1 : 0}><Icon name="chevron-right" size={22} /></button>
          </>
        )}
      </div>
      {props.dots && max > 0 && (
        <div className="pb-dots">
          {Array.from({ length: max + 1 }, (_, k) => (
            <button type="button" key={k} className={k === idx ? 'is-active' : ''} aria-label={`Go to slide ${k + 1}`} aria-current={k === idx} onClick={() => setI(k)} tabIndex={editing ? -1 : 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function SoundCloud({ props }) {
  let ok = false;
  try { const h = new URL(props.url).hostname.replace(/^www\./, ''); ok = h === 'soundcloud.com' || h === 'on.soundcloud.com'; } catch { ok = false; }
  if (!ok) return <Placeholder icon="music">Add a soundcloud.com track or playlist link.</Placeholder>;
  const q = new URLSearchParams({
    url: props.url, color: props.color || '#0057ff', auto_play: 'false', hide_related: 'true',
    show_comments: 'false', show_user: 'true', show_reposts: 'false', visual: props.visual ? 'true' : 'false',
  });
  return <iframe className="pb-frame" title="SoundCloud player" loading="lazy" allow="autoplay" style={{ height: num(props.height, 166) }} src={`https://w.soundcloud.com/player/?${q}`} />;
}

function Maps({ props }) {
  if (!props.query?.trim()) return <Placeholder icon="map-pin">Enter an address or place name.</Placeholder>;
  const q = new URLSearchParams({ q: props.query, t: props.type || 'm', z: String(num(props.zoom, 12)), output: 'embed' });
  return <iframe className="pb-frame" title={`Map of ${props.query}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={{ height: num(props.height, 360) }} src={`https://maps.google.com/maps?${q}`} />;
}

export const mediaWidgets = [
  {
    type: 'image', label: 'Image', category: 'media', icon: 'image',
    description: 'A single image with optional caption and link.',
    defaults: { url: '', alt: '', caption: '', link: '', width: 'full', align: 'center', rounded: true },
    fields: [
      { key: 'url', label: 'Image link', type: 'url', help: 'A public https:// link, such as a Google Drive thumbnail link.' },
      { key: 'alt', label: 'Description (alt text)', type: 'text' },
      { key: 'caption', label: 'Caption', type: 'text' },
      { key: 'link', label: 'Link when clicked (optional)', type: 'url' },
      { key: 'width', label: 'Width', type: 'select', options: opts('auto', 'full', 'half') },
      ALIGN,
      { key: 'rounded', label: 'Rounded corners', type: 'toggle' },
    ],
    Render: ({ props }) => !props.url ? <Placeholder>Add an image link in the properties panel.</Placeholder> : (
      <figure className={`pb-image w-${props.width} a-${props.align} ${props.rounded ? 'is-round' : ''}`}>
        <LinkWrap href={props.link} newTab><img src={props.url} alt={props.alt || ''} loading="lazy" referrerPolicy="no-referrer" /></LinkWrap>
        {props.caption && <figcaption>{props.caption}</figcaption>}
      </figure>
    ),
  },
  {
    type: 'video', label: 'Video', category: 'media', icon: 'video',
    description: 'Embed a video from a link, or paste your own embed code.',
    defaults: { mode: 'url', url: '', code: '', aspect: '16/9', facade: true, caption: '', poster: '' },
    fields: [
      { key: 'mode', label: 'Source', type: 'select', options: [['url', 'Embed URL'], ['html', 'HTML embed code']] },
      { key: 'url', label: 'Video link', type: 'url', showIf: (p) => p.mode !== 'html', help: 'YouTube, Vimeo, Google Drive or a direct .mp4 link.' },
      { key: 'code', label: 'Embed code', type: 'textarea', rows: 6, mono: true, showIf: (p) => p.mode === 'html', help: 'Runs in a sandbox so it cannot affect the rest of the page.' },
      { key: 'aspect', label: 'Aspect ratio', type: 'select', options: [['16/9', '16:9'], ['4/3', '4:3'], ['1/1', 'Square'], ['9/16', 'Vertical 9:16']] },
      { key: 'facade', label: 'Show a picture first and load the video on click', type: 'toggle', showIf: (p) => p.mode !== 'html', help: 'Keeps the page light. Works with YouTube and Google Drive links.' },
      { key: 'caption', label: 'Caption on the picture (optional)', type: 'text', showIf: (p) => p.mode !== 'html' && p.facade },
      { key: 'poster', label: 'Custom picture link (optional)', type: 'url', showIf: (p) => p.mode !== 'html' && p.facade },
    ],
    Render: Video,
  },
  {
    type: 'gallery', label: 'Basic Gallery', category: 'media', icon: 'grid',
    description: 'A grid of images that open in a lightbox, with optional captions.',
    defaults: { images: [{ ...imageItem, caption: '' }, { ...imageItem, caption: '' }, { ...imageItem, caption: '' }], columns: '3', gap: 'md', ratio: '1/1', lightbox: true, showCaptions: false, layout: 'grid' },
    fields: [
      { key: 'layout', label: 'Layout', type: 'select', options: [['grid', 'Even grid'], ['masonry', 'Masonry (keeps each image\u2019s own shape)']] },
      { key: 'columns', label: 'Columns', type: 'select', options: opts('2', '3', '4', '5') },
      { key: 'gap', label: 'Gap', type: 'select', options: opts('sm', 'md', 'lg') },
      { key: 'ratio', label: 'Image shape', type: 'select', options: RATIOS },
      { key: 'lightbox', label: 'Open images in a lightbox', type: 'toggle' },
      { key: 'showCaptions', label: 'Show captions under images', type: 'toggle' },
      {
        key: 'images', label: 'Images', type: 'list', max: 40, newItem: { ...imageItem, caption: '' }, itemLabel: (it, i) => it.caption || it.alt || `Image ${i + 1}`,
        itemFields: [...imageFields, { key: 'caption', label: 'Caption (optional)', type: 'text' }],
      },
    ],
    Render: Gallery,
  },
  {
    type: 'carousel', label: 'Image Carousel', category: 'media', icon: 'layers',
    description: 'Slider, multi-image carousel or fading slideshow.',
    defaults: {
      mode: 'slider', images: [{ ...imageItem, caption: '' }, { ...imageItem, caption: '' }, { ...imageItem, caption: '' }],
      perView: '3', ratio: '16/9', arrows: true, dots: true, autoplay: false, interval: 4,
    },
    fields: [
      { key: 'mode', label: 'Mode', type: 'select', options: [['slider', 'Slider (one image, slides across)'], ['carousel', 'Carousel (several images at once)'], ['slideshow', 'Slideshow (one image, fades)']] },
      { key: 'perView', label: 'Images visible at once', type: 'select', options: opts('2', '3', '4'), showIf: (p) => p.mode === 'carousel' },
      { key: 'ratio', label: 'Image shape', type: 'select', options: RATIOS.filter(([v]) => v !== 'auto') },
      { key: 'arrows', label: 'Show arrows', type: 'toggle' },
      { key: 'dots', label: 'Show dots', type: 'toggle' },
      { key: 'autoplay', label: 'Autoplay', type: 'toggle' },
      { key: 'interval', label: 'Seconds per slide', type: 'number', min: 1, max: 30, showIf: (p) => p.autoplay },
      {
        key: 'images', label: 'Slides', type: 'list', max: 30, newItem: { ...imageItem, caption: '' }, itemLabel: (it, i) => it.alt || `Slide ${i + 1}`,
        itemFields: [...imageFields, { key: 'caption', label: 'Caption (optional)', type: 'text' }],
      },
    ],
    Render: Carousel,
  },
  {
    type: 'soundcloud', label: 'SoundCloud', category: 'media', icon: 'music',
    description: 'Embed a SoundCloud track or playlist.',
    defaults: { url: '', height: '166', color: '#0057ff', visual: false },
    fields: [
      { key: 'url', label: 'SoundCloud link', type: 'url' },
      { key: 'height', label: 'Player', type: 'select', options: [['166', 'Compact'], ['300', 'Standard'], ['450', 'Tall']] },
      { key: 'visual', label: 'Visual player (artwork)', type: 'toggle' },
      { key: 'color', label: 'Accent colour', type: 'color' },
    ],
    Render: SoundCloud,
  },
  {
    type: 'maps', label: 'Google Maps', category: 'media', icon: 'map-pin',
    description: 'Show a place or address on an embedded map.',
    defaults: { query: 'Takoradi, Ghana', zoom: 12, height: 360, type: 'm' },
    fields: [
      { key: 'query', label: 'Address or place', type: 'text' },
      { key: 'zoom', label: 'Zoom', type: 'range', min: 1, max: 20, step: 1 },
      { key: 'height', label: 'Height (px)', type: 'range', min: 200, max: 700, step: 20 },
      { key: 'type', label: 'Map type', type: 'select', options: [['m', 'Map'], ['k', 'Satellite']] },
    ],
    Render: Maps,
  },
];
