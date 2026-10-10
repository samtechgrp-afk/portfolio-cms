import { Icon } from '../icons.jsx';
import { ALIGN, LinkWrap, num, opts, safeId } from './shared.jsx';

const MAXW = { narrow: 640, normal: 960, wide: 1200, full: null };

export const layoutWidgets = [
  {
    type: 'container', label: 'Container', category: 'layout', icon: 'box',
    description: 'A styled section that holds other blocks.',
    defaults: { background: 'none', padding: 'md', maxWidth: 'full', radius: 'md', slots: { children: [] } },
    slots: () => [{ name: 'children', label: 'Container content' }],
    fields: [
      { key: 'background', label: 'Background', type: 'select', options: opts('none', 'soft', 'dark', 'accent') },
      { key: 'padding', label: 'Padding', type: 'select', options: opts('sm', 'md', 'lg') },
      { key: 'maxWidth', label: 'Maximum width', type: 'select', options: opts('narrow', 'normal', 'wide', 'full') },
      { key: 'radius', label: 'Corner radius', type: 'select', options: opts('none', 'md', 'lg') },
    ],
    Render: ({ props, slot }) => (
      <div
        className={`pb-container pb-bg-${props.background} pb-pad-${props.padding} pb-r-${props.radius}`}
        style={MAXW[props.maxWidth] ? { maxWidth: MAXW[props.maxWidth] } : undefined}
      >
        {slot('children')}
      </div>
    ),
  },
  {
    type: 'grid', label: 'Grid', category: 'layout', icon: 'grid',
    description: 'Two to four columns, each holding its own blocks.',
    defaults: { columns: '2', gap: 'md', stack: true, slots: { col1: [], col2: [], col3: [], col4: [] } },
    slots: (p) => Array.from({ length: num(p.columns, 2) }, (_, i) => ({ name: `col${i + 1}`, label: `Column ${i + 1}` })),
    fields: [
      { key: 'columns', label: 'Columns', type: 'select', options: opts('2', '3', '4') },
      { key: 'gap', label: 'Gap', type: 'select', options: opts('sm', 'md', 'lg') },
      { key: 'stack', label: 'Stack columns on mobile', type: 'toggle' },
    ],
    Render: ({ props, slot }) => (
      <div className={`pb-grid pb-gap-${props.gap} ${props.stack ? 'is-stack' : ''}`} style={{ '--cols': num(props.columns, 2) }}>
        {Array.from({ length: num(props.columns, 2) }, (_, i) => (
          <div className="pb-grid__cell" key={i}>{slot(`col${i + 1}`)}</div>
        ))}
      </div>
    ),
  },
  {
    type: 'divider', label: 'Divider', category: 'layout', icon: 'minus',
    description: 'A line to separate content, with an optional label.',
    defaults: { style: 'solid', width: 'full', thickness: 1, label: '' },
    fields: [
      { key: 'style', label: 'Line style', type: 'select', options: opts('solid', 'dashed', 'dotted') },
      { key: 'width', label: 'Width', type: 'select', options: opts('full', 'half', 'short') },
      { key: 'thickness', label: 'Thickness (px)', type: 'number', min: 1, max: 8 },
      { key: 'label', label: 'Label (optional)', type: 'text' },
    ],
    Render: ({ props }) => {
      const line = { borderTopStyle: props.style, borderTopWidth: num(props.thickness, 1) };
      const width = { full: '100%', half: '50%', short: '96px' }[props.width] || '100%';
      return (
        <div className="pb-divider" role="separator" style={{ width }}>
          <span style={line} />
          {props.label ? <><b>{props.label}</b><span style={line} /></> : null}
        </div>
      );
    },
  },
  {
    type: 'spacer', label: 'Spacer', category: 'layout', icon: 'move',
    description: 'Empty vertical space between blocks.',
    defaults: { height: 48 },
    fields: [{ key: 'height', label: 'Height (px)', type: 'range', min: 8, max: 240, step: 4 }],
    Render: ({ props, editing }) => (
      <div className={`pb-spacer ${editing ? 'is-edit' : ''}`} style={{ height: num(props.height, 48) }} aria-hidden="true">
        {editing && <span>Spacer {num(props.height, 48)}px</span>}
      </div>
    ),
  },
  {
    type: 'anchor', label: 'Menu Anchor', category: 'layout', icon: 'anchor',
    description: 'An invisible jump target. Link to it with #your-id.',
    defaults: { anchorId: 'section-1' },
    fields: [{ key: 'anchorId', label: 'Anchor ID', type: 'text', help: 'Letters, numbers, hyphens. Link to it with a button or menu using #this-id.' }],
    Render: ({ props, editing }) => (
      <div id={safeId(props.anchorId) || undefined} className={`pb-anchor ${editing ? 'is-edit' : ''}`}>
        {editing && <><Icon name="anchor" size={14} /> #{safeId(props.anchorId)}</>}
      </div>
    ),
  },
  {
    type: 'sidebar', label: 'Sidebar', category: 'layout', icon: 'columns',
    description: 'A narrow side column next to a main content area.',
    defaults: { side: 'left', width: 30, gap: 'md', sticky: false, slots: { side: [], main: [] } },
    slots: () => [{ name: 'side', label: 'Sidebar' }, { name: 'main', label: 'Main content' }],
    fields: [
      { key: 'side', label: 'Sidebar position', type: 'select', options: opts('left', 'right') },
      { key: 'width', label: 'Sidebar width (%)', type: 'range', min: 20, max: 45, step: 5 },
      { key: 'gap', label: 'Gap', type: 'select', options: opts('sm', 'md', 'lg') },
      { key: 'sticky', label: 'Keep sidebar in view while scrolling', type: 'toggle' },
    ],
    Render: ({ props, slot }) => {
      const w = num(props.width, 30);
      const left = props.side !== 'right';
      const side = <aside className="pb-sidebar__side" key="s">{slot('side')}</aside>;
      const main = <div className="pb-sidebar__main" key="m">{slot('main')}</div>;
      return (
        <div
          className={`pb-sidebar pb-gap-${props.gap} ${props.sticky ? 'is-sticky' : ''}`}
          style={{ '--cols': left ? `${w}% 1fr` : `1fr ${w}%` }}
        >
          {left ? [side, main] : [main, side]}
        </div>
      );
    },
  },
  {
    type: 'linkinbio', label: 'Link in Bio', category: 'layout', icon: 'user',
    description: 'A minimalist profile card with a stack of link buttons.',
    defaults: {
      avatarUrl: '', name: 'Samuel Prah', bio: 'Designer and video editor. Open to remote work.', buttonStyle: 'fill',
      links: [{ label: 'Portfolio', url: '#' }, { label: 'Email me', url: 'mailto:muelprah@gmail.com' }, { label: 'LinkedIn', url: 'https://linkedin.com' }],
    },
    fields: [
      { key: 'avatarUrl', label: 'Avatar image link', type: 'url' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'bio', label: 'Short bio', type: 'textarea', rows: 3 },
      { key: 'buttonStyle', label: 'Button style', type: 'select', options: opts('fill', 'outline', 'soft') },
      {
        key: 'links', label: 'Links', type: 'list', max: 12, newItem: { label: 'New link', url: 'https://' },
        itemLabel: (it) => it.label || 'Link',
        itemFields: [{ key: 'label', label: 'Label', type: 'text' }, { key: 'url', label: 'Link', type: 'url' }],
      },
    ],
    Render: ({ props }) => (
      <div className="pb-lib">
        <div className="pb-lib__avatar">
          {props.avatarUrl ? <img src={props.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span>{(props.name || '?').slice(0, 1)}</span>}
        </div>
        <h3 className="pb-heading">{props.name}</h3>
        {props.bio && <p>{props.bio}</p>}
        <div className="pb-lib__links">
          {(props.links || []).map((l, i) => (
            <LinkWrap key={i} href={l.url} className={`pb-lib__link is-${props.buttonStyle}`}>{l.label}</LinkWrap>
          ))}
        </div>
      </div>
    ),
  },
];
