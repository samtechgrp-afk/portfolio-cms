import { useEffect, useState } from 'react';
import { fontScopeStyle } from '../../typography.js';
import { LINK_FIELD, LinkWrap, cssUrl, isExternalHref, num, opts, resolveLink } from './shared.jsx';
import { GRADIENT_DEFAULTS, GradientOverlay, gradientFields } from './gradient.jsx';

const LEVELS = ['h1', 'h2', 'h3'];
const FONT_HELP = 'Pick an uploaded font from your library, or keep the page fonts.';

const useReducedMotion = () => {
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches), []);
  return reduce;
};

function Hero({ props }) {
  const reduce = useReducedMotion();
  const image = props.bgType === 'image' ? cssUrl(props.bgUrl) : undefined;
  const video = props.bgType === 'video' && /^https?:\/\//i.test(props.bgUrl || '') ? props.bgUrl : null;
  const Tag = LEVELS.includes(props.level) ? props.level : 'h1';
  return (
    <section className={`pb-hero is-${props.align} t-${props.textColor} ${props.verticalAlign === 'bottom' ? 'is-bottom' : ''}`} style={{ minHeight: num(props.minHeight, 420), background: props.bgColor || '#101114' }}>
      {image && <div className="pb-hero__bg" style={{ backgroundImage: image }} />}
      {video && <video className="pb-hero__bg" src={video} autoPlay={!reduce} muted loop playsInline preload="metadata" aria-hidden="true" />}
      <div className="pb-hero__shade" style={{ opacity: num(props.overlay, 45) / 100 }} />
      {(image || video) && <GradientOverlay props={props} />}
      <div className="pb-hero__inner">
        <Tag className="pb-heading pb-hero__title" style={fontScopeStyle(props.headlineFont) || undefined}>{props.headline}</Tag>
        {props.subdeck && <p className="pb-hero__deck" style={fontScopeStyle(props.subdeckFont) || undefined}>{props.subdeck}</p>}
        {(props.buttons || []).length > 0 && (
          <div className="pb-hero__ctas">
            {props.buttons.map((b, i) => {
              const href = resolveLink(b);
              return <LinkWrap key={i} href={href} newTab={isExternalHref(href)} className={`pb-btn is-${b.style || 'fill'} is-lg`}>{b.label}</LinkWrap>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export const heroWidgets = [
  {
    type: 'hero', label: 'Hero Banner', category: 'media', icon: 'maximize',
    description: 'A large banner with headline, subdeck, background media and buttons.',
    defaults: {
      headline: 'Creative direction, motion and design', subdeck: 'Remote designer and video editor based in Takoradi, Ghana.',
      level: 'h1', bgType: 'color', bgUrl: '', bgColor: '#101114', overlay: 45, minHeight: 420, align: 'left', textColor: 'light',
      headlineFont: '', subdeckFont: '', verticalAlign: 'center', ...GRADIENT_DEFAULTS,
      buttons: [
        { label: 'See my work', linkType: 'anchor', anchor: 'work', url: '', projectSlug: '', style: 'fill' },
        { label: 'Get in touch', linkType: 'url', url: 'mailto:muelprah@gmail.com', projectSlug: '', anchor: '', style: 'outline' },
      ],
    },
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'level', label: 'Headline tag', type: 'select', options: LEVELS.map((l) => [l, l.toUpperCase()]) },
      { key: 'headlineFont', label: 'Headline font', type: 'font', help: FONT_HELP },
      { key: 'subdeck', label: 'Subdeck', type: 'textarea', rows: 3 },
      { key: 'subdeckFont', label: 'Subdeck font', type: 'font', help: FONT_HELP },
      { key: 'bgType', label: 'Background', type: 'select', options: [['color', 'Solid colour'], ['image', 'Image'], ['video', 'Video (looping, muted)']] },
      { key: 'bgUrl', label: 'Image or video link', type: 'url', showIf: (p) => p.bgType !== 'color', help: 'A public https:// link. Video must be a direct .mp4 or .webm file.' },
      { key: 'bgColor', label: 'Background colour', type: 'color' },
      { key: 'overlay', label: 'Dark overlay (%)', type: 'range', min: 0, max: 90, step: 5, showIf: (p) => p.bgType !== 'color' },
      ...gradientFields((p) => p.bgType !== 'color'),
      { key: 'minHeight', label: 'Minimum height (px)', type: 'range', min: 240, max: 900, step: 20 },
      { key: 'align', label: 'Text alignment', type: 'select', options: opts('left', 'center', 'right') },
      { key: 'verticalAlign', label: 'Text position', type: 'select', options: [['center', 'Centre'], ['bottom', 'Bottom (best with the gradient)']] },
      { key: 'textColor', label: 'Text colour', type: 'select', options: [['light', 'Light (for dark backgrounds)'], ['dark', 'Dark (for light backgrounds)']] },
      {
        key: 'buttons', label: 'Buttons', type: 'list', max: 3, newItem: { label: 'Button', linkType: 'url', url: 'https://', projectSlug: '', anchor: '', style: 'fill' },
        itemLabel: (it) => it.label || 'Button',
        itemFields: [
          { key: 'label', label: 'Label', type: 'text' },
          LINK_FIELD,
          { key: 'style', label: 'Style', type: 'select', options: opts('fill', 'outline', 'text') },
        ],
      },
    ],
    Render: Hero,
  },
];
