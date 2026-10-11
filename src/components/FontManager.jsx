import { useEffect, useId, useMemo, useState } from 'react';
import './font-manager.css';
import ConfirmDialog from '../cms/components/ConfirmDialog.jsx';
import {
  DEFAULT_TYPOGRAPHY, FONT_ACCEPT, MAX_FONT_BYTES, WEIGHTS, WEIGHT_NAMES, checkFontUrl, googleFamilies, guessFamily, guessWeightStyle,
  injectFontFaces, inspectFontFile, isSafeFamilyName, isSafeFontStack, parseFontUrls, safeFontStack, stackFor, typographyStyle, useTypographyAssets,
} from './typography.js';

const PRESETS = [
  {
    name: 'Playfair Display + Inter', headingFont: '"Playfair Display", serif', bodyFont: 'Inter, sans-serif',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap',
  },
  {
    name: 'Syne + Work Sans', headingFont: 'Syne, sans-serif', bodyFont: '"Work Sans", sans-serif',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Work+Sans:wght@400;500;600&display=swap',
  },
  {
    name: 'Schibsted Grotesk (portfolio)', headingFont: '"Schibsted Grotesk", sans-serif', bodyFont: '"Schibsted Grotesk", sans-serif',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap',
  },
];
const STATUS = {
  loading: ['Loading', 'is-loading'], loaded: ['Loaded', 'is-ok'],
  error: ["Couldn't load. Check the link.", 'is-bad'], invalid: ['Not usable', 'is-bad'],
};
const quoted = (name) => (/\s/.test(name) ? `"${name}"` : name);
const faceName = (f) => `${WEIGHT_NAMES[f.weight] || f.weight}${f.style === 'italic' ? ' italic' : ''}`;

/** Groups library faces by family: [{ family, faces: [...] }]. */
const groupFamilies = (fonts) => {
  const map = new Map();
  fonts.forEach((f) => map.set(f.family, [...(map.get(f.family) || []), f]));
  return [...map.entries()].map(([family, faces]) => ({ family, faces })).sort((a, b) => a.family.localeCompare(b.family));
};

/**
 * The font library: upload several files at once (each with a family name, weight and style) and manage what is there.
 * `library` = { enabled, fonts, add({ file, family, weight, style, format }), remove(font) }.
 * In the project editor, pass `typography` + `onTypography` to get "Use for headings / body" buttons.
 */
export function FontLibrary({ library, usageOf = () => 0, typography, onTypography }) {
  const uid = useId();
  const [queue, setQueue] = useState([]); // { id, file, format, family, weight, style, error }
  const [rejected, setRejected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // Preview every family in its own typeface.
  const key = library.fonts.map((f) => f.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => injectFontFaces(library.fonts), [key]);

  const families = useMemo(() => groupFamilies(library.fonts), [library.fonts]);

  const pick = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    setDone(''); setRejected([]);
    const ok = []; const bad = [];
    for (const file of files) {
      try {
        const { format } = await inspectFontFile(file);
        ok.push({ id: `${file.name}-${file.size}-${Math.random()}`, file, format, family: guessFamily(file.name), ...guessWeightStyle(file.name), error: '' });
      } catch (err) {
        bad.push(`${file.name}: ${err.message}`);
      }
    }
    setQueue((q) => [...q, ...ok]); setRejected(bad);
  };
  const edit = (id, patch) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, ...patch, error: '' } : x)));

  const upload = async () => {
    setBusy(true); setDone('');
    const failed = []; let added = 0;
    for (const item of queue) {
      if (!isSafeFamilyName(item.family)) { failed.push({ ...item, error: 'Use letters, numbers, spaces, hyphens or underscores for the family name.' }); continue; }
      try {
        await library.add({ file: item.file, family: item.family, weight: item.weight, style: item.style, format: item.format });
        added += 1;
      } catch (err) {
        failed.push({ ...item, error: err.userMessage || err.message || "Couldn't upload this font." });
      }
    }
    setQueue(failed);
    setDone(added ? `Added ${added} ${added === 1 ? 'font' : 'fonts'} to the library.` : '');
    setBusy(false);
  };

  const confirmDelete = async () => {
    const font = pendingDelete;
    setPendingDelete(null); setDeleteError('');
    try { await library.remove(font); } catch (err) { setDeleteError(err.userMessage || "Couldn't delete the font."); }
  };

  return (
    <section className="cms-card" aria-labelledby={`${uid}-lib`}>
      <h2 id={`${uid}-lib`}>Font library</h2>
      <p className="cms-hint fm__lead">
        Upload .ttf, .otf, .woff or .woff2 files (up to {MAX_FONT_BYTES / 1024 / 1024} MB each) once and use them on any page. Give each file a family name, a weight and a style;
        files sharing a family name become one family. Only upload fonts you have a licence to use on the web.
      </p>

      {!library.enabled ? (
        <p className="cms-hint">The font library needs the online database. Sign in with Supabase to use it.</p>
      ) : (
        <>
          <div className="cms-field">
            <label className="cms-label" htmlFor={`${uid}-file`}>Add font files</label>
            <input id={`${uid}-file`} type="file" accept={FONT_ACCEPT} multiple className="fm__file" onChange={pick} disabled={busy} />
          </div>

          {rejected.length > 0 && (
            <ul className="fm__rejected" role="alert">{rejected.map((r) => <li key={r} className="cms-error">{r}</li>)}</ul>
          )}

          {queue.length > 0 && (
            <div className="fm__queue">
              <table className="fm__qtable">
                <thead><tr><th scope="col">File</th><th scope="col">Family name</th><th scope="col">Weight</th><th scope="col">Style</th><th scope="col"><span className="cms-sr">Remove</span></th></tr></thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id}>
                      <td className="fm__qfile" title={item.file.name}>{item.file.name}</td>
                      <td>
                        <input className="cms-input" aria-label={`Family name for ${item.file.name}`} value={item.family} spellCheck={false} disabled={busy}
                          aria-invalid={item.error ? 'true' : undefined} onChange={(e) => edit(item.id, { family: e.target.value })} />
                        {item.error && <p className="cms-error">{item.error}</p>}
                      </td>
                      <td>
                        <select className="cms-input" aria-label={`Weight for ${item.file.name}`} value={item.weight} disabled={busy} onChange={(e) => edit(item.id, { weight: Number(e.target.value) })}>
                          {WEIGHTS.map((w) => <option key={w} value={w}>{w} {WEIGHT_NAMES[w]}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="cms-input" aria-label={`Style for ${item.file.name}`} value={item.style} disabled={busy} onChange={(e) => edit(item.id, { style: e.target.value })}>
                          <option value="normal">Normal</option><option value="italic">Italic</option>
                        </select>
                      </td>
                      <td><button type="button" className="cms-btn cms-btn--sm" disabled={busy} onClick={() => setQueue((q) => q.filter((x) => x.id !== item.id))}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="cms-btn cms-btn--primary" onClick={upload} disabled={busy}>
                {busy ? 'Uploading' : `Upload ${queue.length} ${queue.length === 1 ? 'font' : 'fonts'}`}
              </button>
            </div>
          )}
          <div aria-live="polite">{done && <p className="cms-hint fm__ok">{done}</p>}{deleteError && <p className="cms-error" role="alert">{deleteError}</p>}</div>
        </>
      )}

      {families.length === 0 ? (
        <p className="cms-hint">{library.enabled ? 'Your library is empty. Add a font above.' : ''}</p>
      ) : (
        <ul className="fm__families" aria-label="Fonts in the library">
          {families.map(({ family, faces }) => {
            const used = usageOf(family);
            return (
              <li key={family} className="fm__fam">
                <div className="fm__famhead">
                  <strong className="fm__famname">{family}</strong>
                  <span className="cms-hint">{faces.length} {faces.length === 1 ? 'style' : 'styles'}, used on {used} {used === 1 ? 'page' : 'pages'}</span>
                </div>
                <p className="fm__specimen" style={{ fontFamily: stackFor(family) }}>Aa Bb Cc, the quick brown fox 0123456789</p>
                <div className="fm__faces">
                  {faces.map((f) => (
                    <span key={f.id} className="cms-chip">
                      <span style={{ fontFamily: stackFor(f.family), fontWeight: f.weight, fontStyle: f.style }}>{faceName(f)}</span>
                      <button type="button" aria-label={`Delete ${family} ${faceName(f)}`} onClick={() => setPendingDelete(f)}>×</button>
                    </span>
                  ))}
                </div>
                {onTypography && (
                  <div className="fm__use">
                    <button type="button" className="cms-btn cms-btn--sm" onClick={() => onTypography({ ...typography, headingFont: stackFor(family) })}>Use for headings</button>
                    <button type="button" className="cms-btn cms-btn--sm" onClick={() => onTypography({ ...typography, bodyFont: stackFor(family) })}>Use for body</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this font?"
        message={pendingDelete
          ? `${pendingDelete.family} ${faceName(pendingDelete)} will be removed from the library and its file deleted.${usageOf(pendingDelete.family) ? ` ${usageOf(pendingDelete.family)} page(s) use ${pendingDelete.family}; they will fall back to a default font until you pick another.` : ''}`
          : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

/** Dashboard page for the library on its own. */
export function FontLibraryPage({ library, usageOf, onBack }) {
  return (
    <section aria-labelledby="fonts-title">
      <div className="cms-pagehead">
        <div>
          <button type="button" className="cms-linkbtn cms-back" onClick={onBack}>Back to projects</button>
          <h1 id="fonts-title">Font library</h1>
        </div>
      </div>
      <FontLibrary library={library} usageOf={usageOf} />
    </section>
  );
}

/**
 * Typography for one project: the font library, stylesheet links, and the heading and body fonts.
 * value = { fontUrl, headingFont, bodyFont, customFontName, customFontUrl, fontFormat }.
 */
export default function FontManager({ value, onChange, errors = {}, library, usageOf }) {
  const uid = useId();
  const t = { ...DEFAULT_TYPOGRAPHY, ...value };
  const urls = useMemo(() => parseFontUrls(t.fontUrl), [t.fontUrl]);
  const statuses = useTypographyAssets(t, { fonts: library.fonts });
  const googleFonts = useMemo(() => googleFamilies(urls), [urls]);
  const libraryFamilies = useMemo(() => [...new Set(library.fonts.map((f) => f.family))], [library.fonts]);
  const patch = (p) => onChange({ ...t, ...p });

  return (
    <div className="fm">
      <div className="fm__main">
        <FontLibrary library={library} usageOf={usageOf} typography={t} onTypography={onChange} />

        <section className="cms-card" aria-labelledby={`${uid}-fam`}>
          <h2 id={`${uid}-fam`}>Page fonts</h2>
          <p className="cms-hint fm__lead">
            The default heading and body fonts for this page. Pick a font from the library above, or type a CSS family name. Individual blocks can use their own font from the page builder.
          </p>
          <div className="cms-field">
            <label className="cms-label" htmlFor={`${uid}-h`}>Heading font</label>
            <input id={`${uid}-h`} list={`${uid}-dl`} className="cms-input" value={t.headingFont} spellCheck={false} placeholder={'"Playfair Display", serif'}
              onChange={(e) => patch({ headingFont: e.target.value })} aria-invalid={errors['typography.headingFont'] ? 'true' : undefined} />
            {errors['typography.headingFont'] && <p className="cms-error">{errors['typography.headingFont']}</p>}
          </div>
          <div className="cms-field">
            <label className="cms-label" htmlFor={`${uid}-b`}>Body font</label>
            <input id={`${uid}-b`} list={`${uid}-dl`} className="cms-input" value={t.bodyFont} spellCheck={false} placeholder="Inter, sans-serif"
              onChange={(e) => patch({ bodyFont: e.target.value })} aria-invalid={errors['typography.bodyFont'] ? 'true' : undefined} />
            {errors['typography.bodyFont'] && <p className="cms-error">{errors['typography.bodyFont']}</p>}
          </div>
          <datalist id={`${uid}-dl`}>
            {libraryFamilies.map((f) => <option key={f} value={stackFor(f)} />)}
            {googleFonts.map((f) => <option key={f} value={`${quoted(f)}, sans-serif`} />)}
            <option value="sans-serif" /><option value="serif" /><option value="monospace" />
          </datalist>
          {googleFonts.length > 0 && (
            <div className="fm__detected">
              <span className="cms-label">Found in your stylesheet links</span>
              {googleFonts.map((f) => (
                <div key={f} className="fm__family">
                  <strong>{f}</strong>
                  <span>
                    <button type="button" className="cms-btn cms-btn--sm" onClick={() => patch({ headingFont: `${quoted(f)}, sans-serif` })}>Use for headings</button>
                    <button type="button" className="cms-btn cms-btn--sm" onClick={() => patch({ bodyFont: `${quoted(f)}, sans-serif` })}>Use for body</button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="cms-btn cms-btn--sm fm__reset" onClick={() => onChange({ ...DEFAULT_TYPOGRAPHY })}>Reset to default fonts</button>
        </section>

        <section className="cms-card" aria-labelledby={`${uid}-links`}>
          <h2 id={`${uid}-links`}>Font stylesheet links</h2>
          <p className="cms-hint fm__lead">Optional. Paste one link per line: a Google Fonts link, or a .css file that declares your @font-face rules.</p>
          <div className="cms-field">
            <label className="cms-label" htmlFor={`${uid}-url`}>Stylesheet links</label>
            <textarea id={`${uid}-url`} className="cms-input bb-mono" rows={3} spellCheck={false}
              placeholder={'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap'}
              value={t.fontUrl} onChange={(e) => patch({ fontUrl: e.target.value })}
              aria-invalid={errors['typography.fontUrl'] ? 'true' : undefined} aria-describedby={errors['typography.fontUrl'] ? `${uid}-url-err` : undefined} />
            {errors['typography.fontUrl'] && <p id={`${uid}-url-err`} className="cms-error">{errors['typography.fontUrl']}</p>}
          </div>
          {urls.length > 0 && (
            <ul className="fm__status" aria-label="Link status">
              {urls.map((u) => {
                const st = statuses[u] || 'loading';
                return (
                  <li key={u}>
                    <span className={`fm__dot ${STATUS[st][1]}`} aria-hidden="true" />
                    <span className="fm__url" title={u}>{u}</span>
                    <span className="fm__note">{st === 'invalid' ? checkFontUrl(u) : STATUS[st][0]}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="fm__presets">
            <span className="cms-label">Quick start</span>
            <div className="cms-chips">
              {PRESETS.map((p) => (
                <button type="button" key={p.name} className="cms-chip cms-chip--ghost" onClick={() => patch({ fontUrl: p.fontUrl, headingFont: p.headingFont, bodyFont: p.bodyFont })}>{p.name}</button>
              ))}
            </div>
          </div>
        </section>

        {t.customFontUrl && (
          <section className="cms-card" aria-label="Single uploaded font">
            <h2>Single uploaded font (older feature)</h2>
            <p className="cms-hint fm__lead">This page was set up before the library existed. It still works. You can keep it or remove it.</p>
            <div className="fm__family fm__custom">
              <span><strong>{t.customFontName}</strong><span className="cms-hint"> ({t.fontFormat})</span></span>
              <button type="button" className="cms-btn cms-btn--sm cms-btn--ghost-danger" onClick={() => patch({ customFontName: '', customFontUrl: '', fontFormat: '' })}>Remove from this page</button>
            </div>
          </section>
        )}
      </div>

      <aside className="fm__preview cms-card" aria-label="Typography preview" style={typographyStyle(t)}>
        <p className="cms-label">Live preview</p>
        <h3 className="fm__h">The quick brown fox jumps over the lazy dog</h3>
        <p className="fm__p">Body text sits in your chosen body font. A good pairing keeps headings expressive and paragraphs easy to read at length, even on a small screen.</p>
        <p className="fm__p"><strong>Bold text</strong>, <em>italic text</em> and numbers 0123456789.</p>
        <dl className="fm__stacks">
          <dt>Heading stack</dt><dd>{safeFontStack(t.headingFont)}{!isSafeFontStack(t.headingFont) && ' (invalid, using default)'}</dd>
          <dt>Body stack</dt><dd>{safeFontStack(t.bodyFont)}{!isSafeFontStack(t.bodyFont) && ' (invalid, using default)'}</dd>
        </dl>
      </aside>
    </div>
  );
}
