import { Icon } from '../icons.jsx';
import { ALIGN, LINK_FIELD, LinkWrap, Placeholder, isExternalHref, num, opts, resolveLink } from './shared.jsx';

const isHttp = (u) => /^https?:\/\//i.test(u || '');

/** Cards for the published projects. Data comes from the page's `ctx.projects` (the CMS and the site both supply it). */
function ProjectGrid({ props, editing, ctx }) {
  const wanted = (props.category || '').trim().toLowerCase();
  const list = (ctx?.projects || [])
    .filter((p) => !wanted || (p.categories || []).some((c) => c.toLowerCase() === wanted))
    .slice(0, num(props.limit, 12));
  if (!list.length) return editing ? <Placeholder icon="grid">Your published projects appear here. None match yet.</Placeholder> : null;
  return (
    <div className="pb-pcards" style={{ '--cols': num(props.columns, 3) }}>
      {list.map((p) => (
        <a className="pb-pcard" key={p.slug} href={`/work/${encodeURIComponent(p.slug)}`}>
          <div className="pb-pcard__img">
            {isHttp(p.coverUrl) && <img src={p.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.remove()} />}
          </div>
          <div className="pb-pcard__body">
            <h3>{p.title}</h3>
            {props.showSummary && p.summary && <p>{p.summary}</p>}
            {props.showTags && p.categories?.length > 0 && <div className="pb-pcard__tags">{p.categories.map((c) => <span key={c}>{c}</span>)}</div>}
            <div className="pb-pcard__go">View project</div>
          </div>
        </a>
      ))}
    </div>
  );
}

export const listWidgets = [
  {
    type: 'projectgrid', label: 'Project Grid', category: 'cards', icon: 'grid',
    description: 'Cards for your published projects. Each card opens its own page.',
    defaults: { columns: '3', limit: 12, category: '', showSummary: true, showTags: true },
    fields: [
      { key: 'columns', label: 'Columns', type: 'select', options: opts('1', '2', '3', '4') },
      { key: 'limit', label: 'Show at most', type: 'range', min: 1, max: 24, step: 1 },
      { key: 'category', label: 'Only this category (optional)', type: 'text', help: 'Leave empty to show every published project.' },
      { key: 'showSummary', label: 'Show the summary', type: 'toggle' },
      { key: 'showTags', label: 'Show categories', type: 'toggle' },
    ],
    Render: ProjectGrid,
  },
  {
    type: 'detaillist', label: 'Detail List', category: 'basic', icon: 'list',
    description: 'Rows with a title and a detail, such as experience, tools or facts.',
    defaults: {
      layout: 'stacked',
      items: [{ title: 'Role or label', detail: 'Details, dates or description' }, { title: 'Another row', detail: 'More details' }],
    },
    fields: [
      { key: 'layout', label: 'Layout', type: 'select', options: [['stacked', 'Title above detail'], ['inline', 'Title beside detail']] },
      {
        key: 'items', label: 'Rows', type: 'list', max: 30, newItem: { title: 'New row', detail: '' }, itemLabel: (it) => it.title || 'Row',
        itemFields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'detail', label: 'Detail', type: 'textarea', rows: 2 }],
      },
    ],
    Render: ({ props }) => (
      <ul className={`pb-details is-${props.layout}`}>
        {(props.items || []).map((it, i) => <li key={i}><b>{it.title}</b><span>{it.detail}</span></li>)}
      </ul>
    ),
  },
  {
    type: 'taglist', label: 'Tag Chips', category: 'basic', icon: 'hash',
    description: 'A wrapping row of small labels, such as skills.',
    defaults: { align: 'left', items: [{ label: 'Motion graphics' }, { label: 'Video editing' }, { label: 'Brand identity' }] },
    fields: [
      ALIGN,
      { key: 'items', label: 'Tags', type: 'list', max: 40, newItem: { label: 'New tag' }, itemLabel: (it) => it.label || 'Tag', itemFields: [{ key: 'label', label: 'Label', type: 'text' }] },
    ],
    Render: ({ props }) => (
      <ul className="pb-tags" style={{ justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[props.align] }}>
        {(props.items || []).map((it, i) => <li key={i}>{it.label}</li>)}
      </ul>
    ),
  },
  {
    type: 'buttongroup', label: 'Button Group', category: 'basic', icon: 'pointer',
    description: 'Several buttons in a row or a stack. Each can link to a page, a site or an anchor.',
    defaults: {
      layout: 'row', size: 'md', align: 'left',
      items: [{ label: 'Get in touch', linkType: 'url', url: 'mailto:muelprah@gmail.com', projectSlug: '', anchor: '', style: 'fill' }, { label: 'See my work', linkType: 'anchor', url: '', projectSlug: '', anchor: 'projects', style: 'outline' }],
    },
    fields: [
      { key: 'layout', label: 'Layout', type: 'select', options: [['row', 'In a row'], ['stack', 'Stacked, full width']] },
      { key: 'size', label: 'Size', type: 'select', options: opts('sm', 'md', 'lg') },
      { ...ALIGN, label: 'Alignment (rows)' },
      {
        key: 'items', label: 'Buttons', type: 'list', max: 8, newItem: { label: 'Button', linkType: 'url', url: 'https://', projectSlug: '', anchor: '', style: 'fill' }, itemLabel: (it) => it.label || 'Button',
        itemFields: [{ key: 'label', label: 'Label', type: 'text' }, LINK_FIELD, { key: 'style', label: 'Style', type: 'select', options: opts('fill', 'outline', 'text') }],
      },
    ],
    Render: ({ props }) => (
      <div className={`pb-btngroup is-${props.layout}`} style={{ justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[props.align] }}>
        {(props.items || []).map((b, i) => {
          const href = resolveLink(b);
          return <LinkWrap key={i} href={href} newTab={isExternalHref(href)} className={`pb-btn is-${b.style || 'fill'} is-${props.size}`}>{b.label}</LinkWrap>;
        })}
      </div>
    ),
  },
];
