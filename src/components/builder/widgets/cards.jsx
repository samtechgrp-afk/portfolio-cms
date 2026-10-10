import { Icon, CONTENT_ICONS } from '../icons.jsx';
import { ALIGN, LinkWrap, Stars, num, opts } from './shared.jsx';

const iconOptions = CONTENT_ICONS.map((n) => [n, n.replace('-', ' ')]);

export const cardWidgets = [
  {
    type: 'imagebox', label: 'Image Box', category: 'cards', icon: 'image',
    description: 'An image with a title and description.',
    defaults: { imageUrl: '', title: 'Image box title', description: 'A short description that explains the image or project.', url: '', position: 'top', align: 'left', ratio: '4/3' },
    fields: [
      { key: 'imageUrl', label: 'Image link', type: 'url' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { key: 'url', label: 'Link (optional)', type: 'url' },
      { key: 'position', label: 'Image position', type: 'select', options: opts('top', 'left', 'right') },
      { key: 'ratio', label: 'Image shape', type: 'select', options: [['4/3', '4:3'], ['1/1', 'Square'], ['16/9', '16:9'], ['3/2', '3:2']] },
      ALIGN,
    ],
    Render: ({ props }) => (
      <div className={`pb-card pb-imagebox is-${props.position}`} style={{ textAlign: props.align }}>
        <div className="pb-imagebox__img" style={{ aspectRatio: props.ratio }}>
          {props.imageUrl ? <img src={props.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Icon name="image" size={26} />}
        </div>
        <div className="pb-card__body">
          <h3 className="pb-heading"><LinkWrap href={props.url}>{props.title}</LinkWrap></h3>
          <p>{props.description}</p>
        </div>
      </div>
    ),
  },
  {
    type: 'iconbox', label: 'Icon Box', category: 'cards', icon: 'award',
    description: 'An icon with a title and description.',
    defaults: { icon: 'zap', title: 'Fast turnaround', description: 'Describe a service, skill or benefit in a sentence or two.', url: '', position: 'top', shape: 'circle', align: 'left' },
    fields: [
      { key: 'icon', label: 'Icon', type: 'select', options: iconOptions },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { key: 'url', label: 'Link (optional)', type: 'url' },
      { key: 'position', label: 'Icon position', type: 'select', options: opts('top', 'left', 'right') },
      { key: 'shape', label: 'Icon background', type: 'select', options: opts('none', 'circle', 'square') },
      ALIGN,
    ],
    Render: ({ props }) => (
      <div className={`pb-card pb-iconbox is-${props.position}`} style={{ textAlign: props.align }}>
        <span className={`pb-iconwrap is-${props.shape} c-accent`}><Icon name={props.icon} size={28} /></span>
        <div className="pb-card__body">
          <h3 className="pb-heading"><LinkWrap href={props.url}>{props.title}</LinkWrap></h3>
          <p>{props.description}</p>
        </div>
      </div>
    ),
  },
  {
    type: 'iconlist', label: 'Icon List', category: 'cards', icon: 'list',
    description: 'A list where every line has its own icon.',
    defaults: {
      layout: 'vertical', iconColor: 'accent',
      items: [{ icon: 'check', text: 'Logo and brand identity', url: '' }, { icon: 'check', text: 'Event flyers and social graphics', url: '' }, { icon: 'check', text: 'Video editing and motion graphics', url: '' }],
    },
    fields: [
      { key: 'layout', label: 'Layout', type: 'select', options: opts('vertical', 'horizontal') },
      { key: 'iconColor', label: 'Icon colour', type: 'select', options: [['accent', 'Accent'], ['ink', 'Text'], ['muted', 'Muted']] },
      {
        key: 'items', label: 'Items', type: 'list', max: 24, newItem: { icon: 'check', text: 'New item', url: '' }, itemLabel: (it) => it.text || 'Item',
        itemFields: [{ key: 'icon', label: 'Icon', type: 'select', options: iconOptions }, { key: 'text', label: 'Text', type: 'text' }, { key: 'url', label: 'Link (optional)', type: 'url' }],
      },
    ],
    Render: ({ props }) => (
      <ul className={`pb-iconlist is-${props.layout}`}>
        {(props.items || []).map((it, i) => (
          <li key={i}>
            <span className={`c-${props.iconColor}`}><Icon name={it.icon} size={20} /></span>
            <LinkWrap href={it.url}>{it.text}</LinkWrap>
          </li>
        ))}
      </ul>
    ),
  },
  {
    type: 'testimonial', label: 'Testimonial', category: 'cards', icon: 'quote',
    description: 'A client quote with name, role and photo.',
    defaults: { quote: 'Samuel delivered on time and the result was better than we imagined.', name: 'Client name', role: 'Company or role', avatarUrl: '', rating: 5, layout: 'stacked' },
    fields: [
      { key: 'quote', label: 'Quote', type: 'textarea', rows: 4 },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'role', label: 'Role or company', type: 'text' },
      { key: 'avatarUrl', label: 'Photo link (optional)', type: 'url' },
      { key: 'rating', label: 'Star rating (0 hides it)', type: 'range', min: 0, max: 5, step: 0.5 },
      { key: 'layout', label: 'Layout', type: 'select', options: opts('stacked', 'inline') },
    ],
    Render: ({ props }) => (
      <figure className={`pb-card pb-testimonial is-${props.layout}`}>
        {num(props.rating, 0) > 0 && <Stars value={num(props.rating, 0)} size={18} />}
        <blockquote>{props.quote}</blockquote>
        <figcaption>
          <span className="pb-avatar">{props.avatarUrl ? <img src={props.avatarUrl} alt="" referrerPolicy="no-referrer" /> : (props.name || '?').slice(0, 1)}</span>
          <span><strong>{props.name}</strong><br /><span className="pb-muted">{props.role}</span></span>
        </figcaption>
      </figure>
    ),
  },
];
