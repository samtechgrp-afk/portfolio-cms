import { createElement, useId, useState } from 'react';
import { Icon, CONTENT_ICONS } from '../icons.jsx';
import { ALIGN, LINK_FIELD, LinkWrap, Md, isExternalHref, num, opts, resolveLink } from './shared.jsx';

const LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const iconOptions = CONTENT_ICONS.map((n) => [n, n.replace('-', ' ')]);

const PATHS = {
  line: { box: '0 0 800 200', d: 'M 20 110 L 780 110' },
  wave: { box: '0 0 800 200', d: 'M 0 100 C 100 20, 200 20, 300 100 S 500 180, 600 100 S 750 20, 800 100' },
  arc: { box: '0 0 800 260', d: 'M 40 240 A 360 360 0 0 1 760 240' },
  circle: { box: '0 0 400 400', d: 'M 200 200 m -150 0 a 150 150 0 1 1 300 0 a 150 150 0 1 1 -300 0' },
};

function TextPath({ props }) {
  const id = `tp${useId().replace(/:/g, '')}`;
  const shape = PATHS[props.shape] || PATHS.wave;
  return (
    <div className="pb-textpath" style={{ maxWidth: props.shape === 'circle' ? 420 : '100%' }}>
      <svg viewBox={shape.box} role="img" aria-label={props.text}>
        <path id={id} d={shape.d} fill="none" stroke="none" />
        <text fill={props.color || '#0057ff'} fontSize={num(props.fontSize, 28)} letterSpacing={num(props.spacing, 2)} className="pb-textpath__text">
          <textPath href={`#${id}`}>{props.text}</textPath>
        </text>
      </svg>
    </div>
  );
}

function ReadMore({ props, editing }) {
  const [open, setOpen] = useState(false);
  const text = props.content || '';
  const limit = num(props.previewChars, 160);
  const long = text.length > limit;
  const cut = long ? `${text.slice(0, limit).replace(/\s+\S*$/, '')}…` : text;
  const expanded = open || !long;
  return (
    <div className="pb-readmore">
      <Md source={expanded ? text : cut} />
      {long && (
        <button type="button" className="pb-readmore__btn" aria-expanded={expanded} onClick={() => setOpen(!open)} tabIndex={editing ? -1 : 0}>
          {expanded ? props.lessLabel : props.moreLabel}
        </button>
      )}
    </div>
  );
}

export const basicWidgets = [
  {
    type: 'heading', label: 'Heading', category: 'basic', icon: 'type',
    description: 'A title or section heading, h1 to h6.',
    defaults: { text: 'Add your heading', level: 'h2', size: 'auto', align: 'left', url: '' },
    fields: [
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'level', label: 'HTML tag', type: 'select', options: LEVELS.map((l) => [l, l.toUpperCase()]) },
      { key: 'size', label: 'Size', type: 'select', options: [['auto', 'Match tag'], ['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large'], ['xl', 'Extra large']] },
      ALIGN,
      { key: 'url', label: 'Link (optional)', type: 'url' },
    ],
    Render: ({ props }) =>
      createElement(
        LEVELS.includes(props.level) ? props.level : 'h2',
        { className: 'pb-heading', 'data-size': props.size, style: { textAlign: props.align } },
        props.url ? <LinkWrap href={props.url}>{props.text}</LinkWrap> : props.text
      ),
  },
  {
    type: 'text', label: 'Text Editor', category: 'basic', icon: 'align-left',
    description: 'Paragraphs, lists, links and inline styling written in Markdown.',
    defaults: {
      content: 'Write your text here. You can use **bold**, *italic*, [links](https://example.com) and lists:\n\n- First point\n- Second point',
      align: 'left', columns: '1', size: '', lineHeight: '', color: '',
    },
    fields: [
      {
        key: 'content', label: 'Content (Markdown)', type: 'textarea', rows: 10, mono: true,
        help: 'Inline styling: ==highlight== ++underline++ ~~strike~~ [coloured]{#0057ff} [own font]{font:Brand Sans}. Code: wrap in ```js fences.',
      },
      ALIGN,
      { key: 'columns', label: 'Columns', type: 'select', options: opts('1', '2', '3') },
      { key: 'size', label: 'Text size', type: 'select', options: [['', 'Default'], ['14', 'Small (14px)'], ['17', 'Normal (17px)'], ['20', 'Large (20px)'], ['24', 'Extra large (24px)'], ['32', 'Display (32px)']] },
      { key: 'lineHeight', label: 'Line spacing', type: 'select', options: [['', 'Default'], ['1.3', 'Tight'], ['1.6', 'Comfortable'], ['1.9', 'Airy']] },
      { key: 'color', label: 'Text colour', type: 'select', options: [['', 'Default'], ['accent', 'Accent'], ['muted', 'Muted']] },
    ],
    Render: ({ props }) => (
      <div
        className={`pb-text ${props.color ? `c-${props.color}` : ''}`}
        style={{ textAlign: props.align, columnCount: num(props.columns, 1), fontSize: props.size ? `${props.size}px` : undefined, lineHeight: props.lineHeight || undefined }}
      >
        <Md source={props.content} />
      </div>
    ),
  },
  {
    type: 'button', label: 'Button', category: 'basic', icon: 'pointer',
    description: 'A call-to-action: link to a project page, an external site, a live project or an anchor.',
    defaults: { text: 'Get in touch', linkType: 'url', url: '#', projectSlug: '', anchor: '', style: 'fill', size: 'md', align: 'left', newTab: false, icon: 'none' },
    fields: [
      { key: 'text', label: 'Label', type: 'text' },
      LINK_FIELD,
      { key: 'style', label: 'Style', type: 'select', options: opts('fill', 'outline', 'text') },
      { key: 'size', label: 'Size', type: 'select', options: opts('sm', 'md', 'lg') },
      ALIGN,
      { key: 'icon', label: 'Icon', type: 'select', options: [['none', 'None'], ...iconOptions] },
      { key: 'newTab', label: 'Open in a new tab', type: 'toggle' },
    ],
    Render: ({ props }) => {
      const href = resolveLink(props);
      return (
        <div style={{ textAlign: props.align }}>
          <LinkWrap href={href} newTab={props.newTab || isExternalHref(href) && props.linkType === 'live'} className={`pb-btn is-${props.style} is-${props.size}`}>
            {props.text}
            {props.icon !== 'none' && <Icon name={props.icon} size={18} />}
          </LinkWrap>
        </div>
      );
    },
  },
  {
    type: 'icon', label: 'Icon', category: 'basic', icon: 'star',
    description: 'A single decorative or linked icon.',
    defaults: { icon: 'star', size: 48, color: 'accent', shape: 'none', align: 'center', url: '' },
    fields: [
      { key: 'icon', label: 'Icon', type: 'select', options: iconOptions },
      { key: 'size', label: 'Size (px)', type: 'range', min: 16, max: 160, step: 4 },
      { key: 'color', label: 'Colour', type: 'select', options: [['accent', 'Accent'], ['ink', 'Text'], ['muted', 'Muted']] },
      { key: 'shape', label: 'Background shape', type: 'select', options: opts('none', 'circle', 'square') },
      ALIGN,
      { key: 'url', label: 'Link (optional)', type: 'url' },
    ],
    Render: ({ props }) => (
      <div style={{ textAlign: props.align }}>
        <LinkWrap href={props.url} className={`pb-iconwrap is-${props.shape} c-${props.color}`}>
          <Icon name={props.icon} size={num(props.size, 48)} />
        </LinkWrap>
      </div>
    ),
  },
  {
    type: 'textpath', label: 'Text Path', category: 'basic', icon: 'wind',
    description: 'Text that follows a curve, wave or circle.',
    defaults: { text: 'Creative direction and motion design • ', shape: 'wave', fontSize: 28, spacing: 2, color: '#0057ff' },
    fields: [
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'shape', label: 'Path shape', type: 'select', options: opts('line', 'wave', 'arc', 'circle') },
      { key: 'fontSize', label: 'Font size', type: 'range', min: 12, max: 64, step: 1 },
      { key: 'spacing', label: 'Letter spacing', type: 'range', min: 0, max: 12, step: 1 },
      { key: 'color', label: 'Colour', type: 'color' },
    ],
    Render: TextPath,
  },
  {
    type: 'readmore', label: 'Read More', category: 'basic', icon: 'chevrons',
    description: 'A short preview of long text with a Read more toggle.',
    defaults: {
      content: 'I design and edit for people who need work shipped on time. Most of my projects start as a brief and a deadline: a flyer for Saturday, a lecture to edit by Monday, a live stream that cannot drop.\n\nI lead graphic design at a media house, run my own studio and produce live video for a university e-learning centre.',
      previewChars: 160, moreLabel: 'Read more', lessLabel: 'Read less',
    },
    fields: [
      { key: 'content', label: 'Full text (Markdown)', type: 'textarea', rows: 8, mono: true },
      { key: 'previewChars', label: 'Characters shown before the toggle', type: 'number', min: 40, max: 1000 },
      { key: 'moreLabel', label: 'Expand label', type: 'text' },
      { key: 'lessLabel', label: 'Collapse label', type: 'text' },
    ],
    Render: ReadMore,
  },
];
