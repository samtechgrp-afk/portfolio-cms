import { useEffect, useMemo, useRef, useState } from 'react';
import './builder.css';
import { widgetsByCategory } from './WidgetRegistry.jsx';
import { Icon } from './icons.jsx';

export default function BlockPickerModal({ open, onPick, onClose }) {
  const ref = useRef(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) { setQuery(''); dialog.showModal(); }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return widgetsByCategory()
      .map((g) => ({ ...g, widgets: g.widgets.filter((w) => !q || `${w.label} ${w.description} ${g.label}`.toLowerCase().includes(q)) }))
      .filter((g) => g.widgets.length);
  }, [query]);

  return (
    <dialog
      ref={ref} className="bb-modal" aria-labelledby="bb-picker-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="bb-modal__panel">
        <header className="bb-modal__head">
          <h2 id="bb-picker-title">Add a block</h2>
          <div className="bb-modal__search">
            <Icon name="search" size={16} />
            <input type="search" aria-label="Search blocks" placeholder="Search blocks" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>
          <button type="button" className="bb-iconbtn" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
        </header>
        <div className="bb-modal__body">
          {groups.length === 0 && <p className="cms-muted">No blocks match "{query}".</p>}
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`bb-cat-${g.id}`}>
              <h3 id={`bb-cat-${g.id}`} className="bb-modal__cat">{g.label} <span>{g.widgets.length}</span></h3>
              <div className="bb-picker-grid">
                {g.widgets.map((w) => (
                  <button type="button" key={w.type} className="bb-picker-card" onClick={() => onPick(w.type)}>
                    <span className="bb-picker-card__icon"><Icon name={w.icon} size={20} /></span>
                    <strong>{w.label}</strong>
                    <span>{w.description}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
