import { useId } from 'react';
import './builder.css';
import { getWidget, resolveProps } from './WidgetRegistry.jsx';
import { Icon } from './icons.jsx';
import { useBuilder } from './BuilderContext.jsx';
import { LINK_TYPES } from './widgets/shared.jsx';

function FieldShell({ id, field, children }) {
  return (
    <div className="bb-field">
      <label htmlFor={id} className="bb-label">{field.label}</label>
      {children}
      {field.help && <p className="cms-hint">{field.help}</p>}
    </div>
  );
}

/** Pick one of the uploaded library fonts, or inherit the page fonts. */
function FontField({ field, value, onChange }) {
  const id = useId();
  const { fonts } = useBuilder();
  const families = [...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b));
  const known = !value || value === 'heading' || value === 'body' || families.includes(value);
  const faces = (family) => fonts.filter((f) => f.family === family).map((f) => `${f.weight}${f.style === 'italic' ? 'i' : ''}`).join(', ');
  return (
    <FieldShell id={id} field={field}>
      <select id={id} className="cms-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Page fonts (inherit)</option>
        <option value="heading">Project heading font</option>
        <option value="body">Project body font</option>
        {families.length > 0 && <optgroup label="Font library">{families.map((f) => <option key={f} value={f}>{f} ({faces(f)})</option>)}</optgroup>}
        {!known && <option value={value}>{value} (not in the library)</option>}
      </select>
      {families.length === 0 && <p className="cms-hint">No uploaded fonts yet. Add some in the Typography tab or the Font library.</p>}
    </FieldShell>
  );
}

/** One control for a block's link: external URL, project page (/work/slug), a project's live site, or an anchor. Edits several keys at once. */
function LinkField({ field, owner, onPatch }) {
  const id = useId();
  const { projects } = useBuilder();
  const type = owner.linkType || 'url';
  const pages = projects.filter((p) => p.slug !== 'home');
  const picked = pages.find((p) => p.slug === owner.projectSlug);
  const pickProject = (slug) => {
    const project = pages.find((p) => p.slug === slug);
    onPatch(type === 'live' ? { projectSlug: slug, url: project?.liveUrl || '' } : { projectSlug: slug });
  };
  return (
    <div className="bb-field">
      <label htmlFor={id} className="bb-label">{field.label}</label>
      <select id={id} className="cms-input" value={type} onChange={(e) => onPatch({ linkType: e.target.value })}>
        {LINK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {type === 'url' && (
        <input type="text" className="cms-input bb-link-input" aria-label="Link address" placeholder="https://, mailto:, tel: or /page" value={owner.url ?? ''} onChange={(e) => onPatch({ url: e.target.value })} />
      )}
      {(type === 'project' || type === 'live') && (
        <>
          <select className="cms-input bb-link-input" aria-label="Project" value={owner.projectSlug || ''} onChange={(e) => pickProject(e.target.value)}>
            <option value="">Choose a project</option>
            {pages.map((p) => <option key={p.id} value={p.slug}>{p.title}{p.status !== 'published' ? ' (draft)' : ''}</option>)}
          </select>
          {type === 'project' && owner.projectSlug && <p className="cms-hint">Opens /work/{owner.projectSlug}</p>}
          {type === 'live' && owner.projectSlug && (picked?.liveUrl || owner.url
            ? <p className="cms-hint">Opens {owner.url || picked.liveUrl}</p>
            : <p className="cms-error">This project has no live link. Add one in its Details tab, then pick it again.</p>)}
        </>
      )}
      {type === 'anchor' && (
        <input type="text" className="cms-input bb-link-input" aria-label="Anchor id" placeholder="section-1" value={owner.anchor ?? ''} onChange={(e) => onPatch({ anchor: e.target.value })} />
      )}
      {type === 'anchor' && <p className="cms-hint">Jumps to the Menu Anchor block with this ID.</p>}
    </div>
  );
}

function FieldControl({ field, value, onChange, owner, onPatch }) {
  const id = useId();
  switch (field.type) {
    case 'font':
      return <FontField field={field} value={value} onChange={onChange} />;
    case 'link':
      return <LinkField field={field} owner={owner} onPatch={onPatch} />;
    case 'textarea':
      return (
        <FieldShell id={id} field={field}>
          <textarea id={id} className={`cms-input ${field.mono ? 'bb-mono' : ''}`} rows={field.rows || 4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </FieldShell>
      );
    case 'number':
      return (
        <FieldShell id={id} field={field}>
          <input id={id} type="number" className="cms-input" min={field.min} max={field.max} step={field.step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
        </FieldShell>
      );
    case 'range':
      return (
        <FieldShell id={id} field={field}>
          <div className="bb-range">
            <input id={id} type="range" min={field.min} max={field.max} step={field.step} value={value ?? field.min} onChange={(e) => onChange(Number(e.target.value))} />
            <output htmlFor={id}>{value}</output>
          </div>
        </FieldShell>
      );
    case 'select':
      return (
        <FieldShell id={id} field={field}>
          <select id={id} className="cms-input" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </FieldShell>
      );
    case 'toggle':
      return (
        <div className="bb-field">
          <label className="bb-toggle"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /><span>{field.label}</span></label>
          {field.help && <p className="cms-hint">{field.help}</p>}
        </div>
      );
    case 'color':
      return (
        <FieldShell id={id} field={field}>
          <div className="bb-color">
            <input id={id} type="color" value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#0057ff'} onChange={(e) => onChange(e.target.value)} />
            <code>{value || '#0057ff'}</code>
          </div>
        </FieldShell>
      );
    case 'list':
      return <ListField field={field} value={value || []} onChange={onChange} />;
    default: // text, url
      return (
        <FieldShell id={id} field={field}>
          <input id={id} type={field.type === 'url' ? 'url' : 'text'} inputMode={field.type === 'url' ? 'url' : undefined} className="cms-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </FieldShell>
      );
  }
}

function ListField({ field, value, onChange }) {
  const setItem = (i, patch) => onChange(value.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const copy = [...value];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <fieldset className="bb-list-field">
      <legend className="bb-label">{field.label} <span className="cms-muted">({value.length})</span></legend>
      {value.map((item, i) => (
        <fieldset className="bb-listitem" key={i}>
          <legend>{field.itemLabel ? field.itemLabel(item, i) : `Item ${i + 1}`}</legend>
          {field.itemFields.filter((f) => !f.showIf || f.showIf(item)).map((f) => (
            <FieldControl key={f.key} field={f} value={item[f.key]} onChange={(v) => setItem(i, { [f.key]: v })} owner={item} onPatch={(patch) => setItem(i, patch)} />
          ))}
          <div className="bb-listitem__btns">
            <button type="button" className="bb-iconbtn" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="arrow-up" size={14} /></button>
            <button type="button" className="bb-iconbtn" aria-label={`Move item ${i + 1} down`} disabled={i === value.length - 1} onClick={() => move(i, 1)}><Icon name="arrow-down" size={14} /></button>
            <button type="button" className="bb-iconbtn is-danger" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(value.filter((_, k) => k !== i))}><Icon name="trash" size={14} /></button>
          </div>
        </fieldset>
      ))}
      <button type="button" className="cms-btn cms-btn--sm" disabled={field.max && value.length >= field.max} onClick={() => onChange([...value, JSON.parse(JSON.stringify(field.newItem))])}>
        <Icon name="plus" size={14} /> Add item
      </button>
    </fieldset>
  );
}

/** Side panel. Calls onChange(patch) on every edit so the canvas updates in real time. */
export default function PropertyInspector({ block, onChange, onClose, onDuplicate, onToggleHidden, onDelete }) {
  if (!block) {
    return (
      <aside className="bb-inspector is-empty" aria-label="Block properties">
        <Icon name="pointer" size={26} />
        <h2>No block selected</h2>
        <p>Click a block on the canvas to edit its properties here.</p>
      </aside>
    );
  }
  const w = getWidget(block.type);
  const props = w ? resolveProps(w, block.props) : block.props;
  const fields = (w?.fields || []).filter((f) => !f.showIf || f.showIf(props));
  return (
    <aside className="bb-inspector is-open" aria-label={`${w?.label ?? block.type} properties`}>
      <header className="bb-inspector__head">
        <span className="bb-picker-card__icon">{w && <Icon name={w.icon} size={18} />}</span>
        <h2>{w?.label ?? block.type}</h2>
        <button type="button" className="bb-iconbtn" aria-label="Close properties" onClick={onClose}><Icon name="x" size={18} /></button>
      </header>
      <div className="bb-inspector__body">
        {fields.map((f) => (
          <FieldControl key={`${block.id}-${f.key}`} field={f} value={props[f.key]} onChange={(v) => onChange({ [f.key]: v })} owner={props} onPatch={onChange} />
        ))}
        {w?.slots && <p className="cms-hint">This block holds other blocks. Use the "Add block" buttons inside it on the canvas.</p>}
        {!fields.length && !w?.slots && <p className="cms-hint">This block has no settings.</p>}
      </div>
      <footer className="bb-inspector__foot">
        <button type="button" className="cms-btn cms-btn--sm" onClick={onDuplicate}><Icon name="copy" size={14} /> Duplicate</button>
        <button type="button" className="cms-btn cms-btn--sm" onClick={onToggleHidden}><Icon name={block.hidden ? 'eye' : 'eye-off'} size={14} /> {block.hidden ? 'Show' : 'Hide'}</button>
        <button type="button" className="cms-btn cms-btn--sm cms-btn--ghost-danger" onClick={onDelete}><Icon name="trash" size={14} /> Delete</button>
      </footer>
    </aside>
  );
}
