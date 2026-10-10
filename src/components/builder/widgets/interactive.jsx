import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons.jsx';
import { ALIGN, LinkWrap, Md, Stars, num, opts } from './shared.jsx';

function Counter({ props, editing }) {
  const start = num(props.start, 0);
  const end = num(props.end, 100);
  const duration = Math.max(200, num(props.duration, 2000));
  const [val, setVal] = useState(editing ? end : start);
  const ref = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (editing || reduce || typeof IntersectionObserver === 'undefined') { setVal(end); return undefined; }
    setVal(start);
    let raf;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / duration);
        setVal(Math.round(start + (end - start) * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [start, end, duration, editing]);

  return (
    <div ref={ref} className="pb-counter" style={{ textAlign: props.align }}>
      <div className="pb-counter__num" aria-label={`${props.prefix || ''}${end}${props.suffix || ''}`}>
        {props.prefix}{props.separator ? val.toLocaleString('en-US') : val}{props.suffix}
      </div>
      {props.label && <div className="pb-counter__label">{props.label}</div>}
    </div>
  );
}

function Tabs({ props, editing }) {
  const items = props.items || [];
  const [active, setActive] = useState(0);
  const idx = Math.min(active, Math.max(0, items.length - 1));
  const uid = useRef(`tabs-${Math.random().toString(36).slice(2, 7)}`).current;
  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    setActive((idx + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length);
  };
  if (!items.length) return null;
  return (
    <div className={`pb-tabs is-${props.style}`}>
      <div className="pb-tabs__list" role="tablist" onKeyDown={onKey} style={{ justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[props.align] }}>
        {items.map((it, i) => (
          <button
            type="button" role="tab" key={i} id={`${uid}-t${i}`} aria-selected={i === idx} aria-controls={`${uid}-p${i}`}
            tabIndex={editing ? -1 : i === idx ? 0 : -1} onClick={() => setActive(i)}
          >{it.title}</button>
        ))}
      </div>
      <div className="pb-tabs__panel" role="tabpanel" id={`${uid}-p${idx}`} aria-labelledby={`${uid}-t${idx}`}>
        <Md source={items[idx].content} />
      </div>
    </div>
  );
}

function Accordion({ props, editing }) {
  const items = props.items || [];
  const initial = () => (props.openFirst && items.length ? [0] : []);
  const [open, setOpen] = useState(initial);
  const uid = useRef(`acc-${Math.random().toString(36).slice(2, 7)}`).current;
  useEffect(() => { setOpen(initial()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [props.openFirst, props.multiple]);
  const toggle = (i) => setOpen((o) => (o.includes(i) ? o.filter((x) => x !== i) : props.multiple ? [...o, i] : [i]));
  return (
    <div className="pb-accordion">
      {items.map((it, i) => {
        const isOpen = open.includes(i);
        return (
          <div className="pb-accordion__item" key={i}>
            <h3>
              <button type="button" aria-expanded={isOpen} aria-controls={`${uid}-${i}`} onClick={() => toggle(i)} tabIndex={editing ? -1 : 0}>
                <span>{it.title}</span><Icon name="chevron-down" size={18} className={isOpen ? 'is-open' : ''} />
              </button>
            </h3>
            <div id={`${uid}-${i}`} role="region" hidden={!isOpen} className="pb-accordion__panel"><Md source={it.content} /></div>
          </div>
        );
      })}
    </div>
  );
}

function Alert({ props, editing }) {
  const [hidden, setHidden] = useState(false);
  if (hidden && !editing) return null;
  const urgent = props.kind === 'danger' || props.kind === 'warning';
  return (
    <div className={`pb-alert is-${props.kind}`} role={urgent ? 'alert' : 'status'}>
      <Icon name={props.kind === 'success' ? 'check' : 'alert'} size={20} />
      <div>{props.title && <strong>{props.title}</strong>}<div>{props.text}</div></div>
      {props.dismissible && <button type="button" className="pb-alert__x" aria-label="Dismiss" onClick={() => setHidden(true)} tabIndex={editing ? -1 : 0}><Icon name="x" size={16} /></button>}
    </div>
  );
}

const NETWORKS = {
  facebook: { label: 'Facebook', icon: 'facebook' }, instagram: { label: 'Instagram', icon: 'instagram' },
  x: { label: 'X (Twitter)', icon: 'twitter' }, linkedin: { label: 'LinkedIn', icon: 'linkedin' },
  youtube: { label: 'YouTube', icon: 'youtube' }, github: { label: 'GitHub', icon: 'github' },
  tiktok: { label: 'TikTok', letter: 'T' }, whatsapp: { label: 'WhatsApp', letter: 'W' },
  pinterest: { label: 'Pinterest', letter: 'P' }, behance: { label: 'Behance', letter: 'Be' },
  dribbble: { label: 'Dribbble', letter: 'D' }, website: { label: 'Website', icon: 'globe' },
  email: { label: 'Email', icon: 'mail' }, phone: { label: 'Phone', icon: 'phone' },
};
const networkOptions = Object.entries(NETWORKS).map(([v, n]) => [v, n.label]);

export const interactiveWidgets = [
  {
    type: 'rating', label: 'Star Rating', category: 'interactive', icon: 'star',
    description: 'Show a score out of five stars.',
    defaults: { value: 4.5, max: 5, label: 'Client satisfaction', size: 28, color: '#f5a623', align: 'left' },
    fields: [
      { key: 'value', label: 'Score', type: 'range', min: 0, max: 10, step: 0.5 },
      { key: 'max', label: 'Number of stars', type: 'select', options: opts('3', '5', '10') },
      { key: 'label', label: 'Label (optional)', type: 'text' },
      { key: 'size', label: 'Star size (px)', type: 'range', min: 14, max: 56, step: 2 },
      { key: 'color', label: 'Star colour', type: 'color' },
      ALIGN,
    ],
    Render: ({ props }) => (
      <div className="pb-rating" style={{ textAlign: props.align }}>
        <Stars value={num(props.value, 0)} max={num(props.max, 5)} size={num(props.size, 28)} color={props.color} />
        {props.label && <span className="pb-rating__label">{props.label}</span>}
      </div>
    ),
  },
  {
    type: 'counter', label: 'Counter', category: 'interactive', icon: 'hash',
    description: 'A number that counts up when it scrolls into view.',
    defaults: { start: 0, end: 150, prefix: '', suffix: '+', duration: 2000, separator: true, label: 'Projects delivered', align: 'center' },
    fields: [
      { key: 'start', label: 'Start number', type: 'number' },
      { key: 'end', label: 'End number', type: 'number' },
      { key: 'prefix', label: 'Prefix', type: 'text' },
      { key: 'suffix', label: 'Suffix', type: 'text' },
      { key: 'duration', label: 'Animation time (ms)', type: 'number', min: 200, max: 10000, step: 100 },
      { key: 'separator', label: 'Thousands separator', type: 'toggle' },
      { key: 'label', label: 'Label', type: 'text' },
      ALIGN,
    ],
    Render: Counter,
  },
  {
    type: 'tabs', label: 'Tabs', category: 'interactive', icon: 'layout',
    description: 'Switch between panels of content.',
    defaults: {
      style: 'underline', align: 'left',
      items: [{ title: 'Overview', content: 'What the project was and why it mattered.' }, { title: 'Process', content: 'How the work was planned, shot and edited.' }, { title: 'Result', content: 'What was delivered and what came of it.' }],
    },
    fields: [
      { key: 'style', label: 'Style', type: 'select', options: opts('underline', 'pills') },
      { key: 'align', label: 'Tab alignment', type: 'select', options: opts('left', 'center', 'right') },
      {
        key: 'items', label: 'Tabs', type: 'list', max: 8, newItem: { title: 'New tab', content: 'Tab content' }, itemLabel: (it) => it.title || 'Tab',
        itemFields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'content', label: 'Content (Markdown)', type: 'textarea', rows: 4 }],
      },
    ],
    Render: Tabs,
  },
  {
    type: 'accordion', label: 'Accordion', category: 'interactive', icon: 'chevrons',
    description: 'Collapsible questions and answers.',
    defaults: {
      multiple: false, openFirst: true,
      items: [{ title: 'What do you work with?', content: 'Premiere Pro, After Effects, DaVinci Resolve, Photoshop and Illustrator.' }, { title: 'Do you work remotely?', content: 'Yes. I collaborate with teams over Zoom and Microsoft Teams.' }, { title: 'How fast is the turnaround?', content: 'It depends on the brief. Flyers take days; films take longer.' }],
    },
    fields: [
      { key: 'multiple', label: 'Allow several open at once', type: 'toggle' },
      { key: 'openFirst', label: 'Open the first item', type: 'toggle' },
      {
        key: 'items', label: 'Items', type: 'list', max: 20, newItem: { title: 'New question', content: 'Answer' }, itemLabel: (it) => it.title || 'Item',
        itemFields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'content', label: 'Content (Markdown)', type: 'textarea', rows: 4 }],
      },
    ],
    Render: Accordion,
  },
  {
    type: 'social', label: 'Social Icons', category: 'interactive', icon: 'share',
    description: 'Icon links to your social profiles.',
    defaults: {
      size: 40, shape: 'circle', align: 'left',
      items: [{ network: 'instagram', url: 'https://instagram.com' }, { network: 'linkedin', url: 'https://linkedin.com/in/samuel-prah-5963891b3' }, { network: 'youtube', url: 'https://youtube.com' }],
    },
    fields: [
      { key: 'size', label: 'Size (px)', type: 'range', min: 24, max: 72, step: 2 },
      { key: 'shape', label: 'Shape', type: 'select', options: opts('circle', 'square', 'none') },
      ALIGN,
      {
        key: 'items', label: 'Profiles', type: 'list', max: 14, newItem: { network: 'website', url: 'https://' }, itemLabel: (it) => NETWORKS[it.network]?.label || 'Profile',
        itemFields: [{ key: 'network', label: 'Network', type: 'select', options: networkOptions }, { key: 'url', label: 'Link', type: 'url' }],
      },
    ],
    Render: ({ props }) => (
      <div className="pb-social" style={{ justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[props.align] }}>
        {(props.items || []).map((it, i) => {
          const n = NETWORKS[it.network] || NETWORKS.website;
          const s = num(props.size, 40);
          return (
            <LinkWrap key={i} href={it.url} newTab className={`pb-social__link is-${props.shape}`} style={{ width: s, height: s }} aria-label={n.label}>
              {n.icon ? <Icon name={n.icon} size={Math.round(s * 0.5)} /> : <b style={{ fontSize: s * 0.36 }}>{n.letter}</b>}
            </LinkWrap>
          );
        })}
      </div>
    ),
  },
  {
    type: 'progress', label: 'Progress Bar', category: 'interactive', icon: 'activity',
    description: 'A labelled bar showing a percentage.',
    defaults: { label: 'Video editing', value: 85, showPercent: true, height: 12, color: '#0057ff' },
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'value', label: 'Value (%)', type: 'range', min: 0, max: 100, step: 1 },
      { key: 'showPercent', label: 'Show percentage', type: 'toggle' },
      { key: 'height', label: 'Bar height (px)', type: 'range', min: 4, max: 32, step: 1 },
      { key: 'color', label: 'Bar colour', type: 'color' },
    ],
    Render: ({ props }) => {
      const v = Math.max(0, Math.min(100, num(props.value, 0)));
      return (
        <div className="pb-progress">
          <div className="pb-progress__head"><span>{props.label}</span>{props.showPercent && <span>{v}%</span>}</div>
          <div className="pb-progress__track" role="progressbar" aria-label={props.label || 'Progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} style={{ height: num(props.height, 12) }}>
            <div className="pb-progress__bar" style={{ width: `${v}%`, background: props.color }} />
          </div>
        </div>
      );
    },
  },
  {
    type: 'alert', label: 'Alert', category: 'interactive', icon: 'alert',
    description: 'A highlighted notice: info, success, warning or error.',
    defaults: { kind: 'info', title: 'Good to know', text: 'Use this block to call out important information.', dismissible: false },
    fields: [
      { key: 'kind', label: 'Type', type: 'select', options: [['info', 'Info'], ['success', 'Success'], ['warning', 'Warning'], ['danger', 'Error']] },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Message', type: 'textarea', rows: 3 },
      { key: 'dismissible', label: 'Let visitors dismiss it', type: 'toggle' },
    ],
    Render: Alert,
  },
];
