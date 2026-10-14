import { useId, useRef, useState } from 'react';
import { safeIconUrl, iconMime } from '../../components/siteIcon.js';

const DEFAULT_ICON = '/favicon.svg';

/** Global site settings. Today: the site icon (favicon). More settings can be added as sections here. */
export default function SiteSettingsPage({ settings, assets, saving, onSave, onBack }) {
  const saved = settings.siteIconUrl || '';
  const [draft, setDraft] = useState(saved);
  const [mode, setMode] = useState(assets?.enabled ? 'upload' : 'link');
  const [linkText, setLinkText] = useState(saved && !/\/storage\/v1\/object\/public\/site-assets\//.test(saved) ? saved : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);
  const fileRef = useRef(null);
  const linkId = useId();
  const dirty = draft !== saved;
  const shown = draft || DEFAULT_ICON;

  const pick = async (file) => {
    if (!file) return;
    setBusy(true); setError('');
    try { const r = await assets.upload(file, 'icon'); setDraft(r.url); setBroken(false); }
    catch (e) { setError(e.userMessage || e.message || "Couldn't upload the file."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const useLink = () => {
    const url = linkText.trim();
    if (!/^https:\/\//i.test(url) || !safeIconUrl(url)) { setError('Paste a direct image link that starts with https://'); return; }
    setError(''); setBroken(false); setDraft(url);
  };

  return (
    <section aria-labelledby="site-settings-title">
      <div className="cms-pagehead">
        <div>
          <button type="button" className="cms-linkbtn" onClick={onBack}>← Back to projects</button>
          <h1 id="site-settings-title">Site settings</h1>
          <p className="cms-muted">Settings that apply to the whole website.</p>
        </div>
        <div className="cms-pagehead__actions">
          <button type="button" className="cms-btn cms-btn--primary" disabled={!dirty || saving || busy} onClick={() => onSave({ siteIconUrl: draft })}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </div>

      <div className="cms-card">
        <h2>Site icon (favicon)</h2>
        <p className="cms-muted">The small picture in the browser tab, bookmarks and the phone home screen. Use a square image, at least 180 × 180 px for the sharpest result.</p>

        <div className="cms-iconprev" role="group" aria-label="Icon preview">
          <div className="cms-iconprev__tab" aria-hidden="true"><img src={shown} alt="" width="16" height="16" onError={() => setBroken(true)} onLoad={() => setBroken(false)} /><span>Samuel Prah</span></div>
          <img className="cms-iconprev__big" src={shown} alt={draft ? 'Current site icon' : 'Default site icon'} width="64" height="64" />
          <div>
            <strong>{draft ? (dirty ? 'New icon (not saved yet)' : 'Active icon') : 'Default icon'}</strong>
            <p className="cms-muted cms-iconprev__meta">{draft ? <>{iconMime(draft) || 'image'} · <span className="cms-iconprev__url">{draft}</span></> : 'No custom icon is set, so the site uses its built-in one.'}</p>
            {broken && <p className="cms-error" role="alert">This image does not load. Check the link or upload a file.</p>}
          </div>
        </div>

        <div className="cms-seg" role="radiogroup" aria-label="How to set the icon">
          <button type="button" role="radio" aria-checked={mode === 'upload'} className={mode === 'upload' ? 'is-on' : ''} onClick={() => setMode('upload')}>Upload a file</button>
          <button type="button" role="radio" aria-checked={mode === 'link'} className={mode === 'link' ? 'is-on' : ''} onClick={() => setMode('link')}>Paste a link</button>
        </div>

        {mode === 'upload' && (
          <div className="cms-field">
            <button type="button" className="cms-btn" disabled={!assets?.enabled || busy} onClick={() => fileRef.current?.click()}>{busy ? 'Uploading…' : 'Choose an image'}</button>
            <input ref={fileRef} type="file" hidden accept=".png,.ico,.svg,.jpg,.jpeg,image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/jpeg" onChange={(e) => pick(e.target.files?.[0])} />
            <p className="cms-hint">PNG, ICO, SVG or JPG, up to 2 MB. {assets?.enabled ? 'It is stored in your Supabase `site-assets` bucket.' : 'Uploads need the Supabase connection; pasting a link works without it.'}</p>
          </div>
        )}
        {mode === 'link' && (
          <div className="cms-field">
            <label htmlFor={linkId} className="cms-label">Image link</label>
            <div className="cms-inline">
              <input id={linkId} type="url" inputMode="url" className="cms-input" placeholder="https://example.com/icon.png" value={linkText} onChange={(e) => setLinkText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); useLink(); } }} />
              <button type="button" className="cms-btn" onClick={useLink}>Use this link</button>
            </div>
            <p className="cms-hint">A direct link to a PNG, ICO, SVG or JPG file.</p>
          </div>
        )}
        {error && <p className="cms-error" role="alert">{error}</p>}
        {draft && <p><button type="button" className="cms-btn cms-btn--sm" onClick={() => { setDraft(''); setLinkText(''); setError(''); setBroken(false); }}>Remove and use the default icon</button></p>}
        <p className="cms-hint">Browsers keep favicons for a while. After saving, a hard refresh (Ctrl/Cmd + Shift + R) shows the new one sooner.</p>
      </div>
    </section>
  );
}
