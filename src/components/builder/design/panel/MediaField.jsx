import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../icons.jsx';
import { useBuilder } from '../../BuilderContext.jsx';

/** Image source: paste a link, upload a file, or pick from the media library. */
export default function MediaField({ field, value, onChange }) {
  const id = useId();
  const { media } = useBuilder();
  const fileRef = useRef(null);
  const dlg = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const can = media?.enabled;

  const upload = async (file) => {
    if (!file) return;
    setBusy(true); setMsg('');
    try { const r = await media.upload(file); onChange(r.url); setItems(null); }
    catch (e) { setMsg(e.userMessage || e.message || "Couldn't upload the image."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const load = async () => { setMsg(''); try { setItems(await media.list()); } catch (e) { setItems([]); setMsg(e.userMessage || e.message); } };
  useEffect(() => {
    const d = dlg.current; if (!d) return;
    if (open && !d.open) { d.showModal(); if (!items) load(); }
    if (!open && d.open) d.close();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = async (it) => { try { await media.remove(it.path); setItems((l) => l.filter((x) => x.path !== it.path)); } catch (e) { setMsg(e.userMessage || e.message); } };

  return (
    <div className="bb-field">
      <label htmlFor={id} className="bb-label">{field.label}</label>
      <input id={id} type="url" inputMode="url" className="cms-input" placeholder="https://" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      <div className="dp-control" style={{ marginTop: 8 }}>
        <button type="button" className="cms-btn cms-btn--sm dp-add" disabled={!can || busy} onClick={() => fileRef.current?.click()}><Icon name="plus" size={14} /> {busy ? 'Uploading…' : 'Upload image'}</button>
        <button type="button" className="cms-btn cms-btn--sm dp-add" disabled={!can} onClick={() => setOpen(true)}><Icon name="image" size={14} /> Media library</button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {!can && <p className="cms-hint">Uploads and the library need the Supabase connection. A pasted link always works.</p>}
      {msg && <p className="cms-error" role="alert">{msg}</p>}
      {field.help && <p className="cms-hint">{field.help}</p>}
      <dialog ref={dlg} className="dp-media" onClose={() => setOpen(false)} aria-label="Media library">
        <header><h2>Media library</h2><button type="button" className="bb-iconbtn" aria-label="Close media library" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></header>
        {items === null && <p className="cms-muted">Loading…</p>}
        {items?.length === 0 && <p className="cms-muted">No images yet. Upload one and it will appear here.</p>}
        <ul className="dp-media__grid">
          {(items || []).map((it) => (
            <li key={it.path}>
              <button type="button" className="dp-media__pick" aria-label={`Use image ${it.path}`} onClick={() => { onChange(it.url); setOpen(false); }}>
                <img src={it.url} alt="" loading="lazy" />
              </button>
              <button type="button" className="dp-icon is-danger dp-media__del" onClick={() => remove(it)}><Icon name="trash" size={14} /><span className="dp-sr">Delete image {it.path}</span></button>
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
