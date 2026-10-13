import { fontScopeStyle } from '../../typography.js';
import { LINK_FIELD, LinkWrap, Placeholder, isExternalHref, opts, resolveLink } from './shared.jsx';
import { GRADIENT_DEFAULTS, GradientOverlay, gradientFields } from './gradient.jsx';

const LEVELS = ['h2', 'h3', 'h1'];
const FONT_HELP = 'Pick an uploaded font from your library, or keep the page fonts.';

/** An image with the title, subtitle and buttons on top. The gradient keeps the text readable. */
function ImageBanner({ props }) {
  const Tag = LEVELS.includes(props.level) ? props.level : 'h2';
  const buttons = props.buttons || [];
  return (
    <section className={`pb-banner is-${props.align || 'left'}`} style={{ '--banner-h': `${Number(props.height) || 380}px` }}>
      {props.imageUrl
        ? <img className="pb-banner__img" src={props.imageUrl} alt={props.alt || ''} loading="lazy" referrerPolicy="no-referrer" />
        : <Placeholder icon="image">Add an image link in the properties panel.</Placeholder>}
      <GradientOverlay props={props} />
      <div className="pb-banner__inner">
        {props.title && <Tag className="pb-heading pb-banner__title" style={fontScopeStyle(props.titleFont) || undefined}>{props.title}</Tag>}
        {props.subtitle && <p className="pb-banner__sub" style={fontScopeStyle(props.subtitleFont) || undefined}>{props.subtitle}</p>}
        {buttons.length > 0 && (
          <div className="pb-banner__ctas">
            {buttons.map((b, i) => {
              const href = resolveLink(b);
              return <LinkWrap key={i} href={href} newTab={isExternalHref(href)} className={`pb-btn is-${b.style || 'fill'}`}>{b.label}</LinkWrap>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export const bannerWidgets = [
  {
    type: 'imagebanner', label: 'Image Banner', category: 'media', icon: 'image',
    description: 'A wide image with a title, subtitle and buttons over a readability gradient.',
    defaults: {
      imageUrl: '', alt: '', title: 'Campaign title', subtitle: 'A short line about the project or the work shown.', level: 'h2',
      height: 380, align: 'left', titleFont: '', subtitleFont: '', ...GRADIENT_DEFAULTS,
      buttons: [{ label: 'View project', linkType: 'url', url: 'https://', projectSlug: '', anchor: '', style: 'fill' }],
    },
    fields: [
      { key: 'imageUrl', label: 'Image link', type: 'url', help: 'A public https:// link, such as a Google Drive thumbnail link.' },
      { key: 'alt', label: 'Description (alt text)', type: 'text', help: 'Leave empty if the image is only decoration.' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'level', label: 'Title tag', type: 'select', options: LEVELS.map((l) => [l, l.toUpperCase()]) },
      { key: 'titleFont', label: 'Title font', type: 'font', help: FONT_HELP },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea', rows: 3 },
      { key: 'subtitleFont', label: 'Subtitle font', type: 'font', help: FONT_HELP },
      ...gradientFields((p) => !!p.imageUrl),
      { key: 'height', label: 'Height (px)', type: 'range', min: 240, max: 720, step: 20 },
      { key: 'align', label: 'Text alignment', type: 'select', options: opts('left', 'center', 'right') },
      {
        key: 'buttons', label: 'Buttons', type: 'list', max: 2, newItem: { label: 'Button', linkType: 'url', url: 'https://', projectSlug: '', anchor: '', style: 'fill' },
        itemLabel: (it) => it.label || 'Button',
        itemFields: [
          { key: 'label', label: 'Label', type: 'text' },
          LINK_FIELD,
          { key: 'style', label: 'Style', type: 'select', options: opts('fill', 'outline', 'text') },
        ],
      },
    ],
    Render: ImageBanner,
  },
];
