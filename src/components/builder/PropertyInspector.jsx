import { useId } from 'react';
import './builder.css';
import { getWidget } from './WidgetRegistry.jsx';
import { Icon } from './icons.jsx';

function FieldShell({ id, field, children }) {
  return (
    <div className="bb-field">
      <label htmlFor={id} className="bb-label">{field.label}</label>
      {children}
      {field.help && <p className="cms-hint">{field.help}</p>}
    </div>
  );
}

function FieldControl({ field, value, onChange }) {
  const id = useId();
  switch (field.type) {
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
          {field.itemFields.map((f) => (
            <FieldControl key={f.key} field={f} value={item[f.key]} onChange={(v) => setItem(i, { [f.key]: v })} />
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
export default function PropertyInspector({ block, onChange, onClose, onDuplicate, onDelete }) {
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
  const props = { ...(w?.defaults || {}), ...block.props };
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
          <FieldControl key={`${block.id}-${f.key}`} field={f} value={props[f.key]} onChange={(v) => onChange({ [f.key]: v })} />
        ))}
        {w?.slots && <p className="cms-hint">This block holds other blocks. Use the "Add block" buttons inside it on the canvas.</p>}
        {!fields.length && !w?.slots && <p className="cms-hint">This block has no settings.</p>}
      </div>
      <footer className="bb-inspector__foot">
        <button type="button" className="cms-btn cms-btn--sm" onClick={onDuplicate}><Icon name="copy" size={14} /> Duplicate</button>
        <button type="button" className="cms-btn cms-btn--sm cms-btn--ghost-danger" onClick={onDelete}><Icon name="trash" size={14} /> Delete</button>
      </footer>
    </aside>
  );
}
