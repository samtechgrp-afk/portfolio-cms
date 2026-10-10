import { useId, useMemo, useState } from 'react';
import './font-manager.css';
import {
  DEFAULT_TYPOGRAPHY, FONT_ACCEPT, MAX_FONT_BYTES, checkFontUrl, familyFromFilename, googleFamilies, inspectFontFile,
  isSafeFamilyName, isSafeFontStack, parseFontUrls, safeFontStack, typographyStyle, useTypographyAssets,
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
const stackFor = (name) => `"${name}", sans-serif`;
const withoutFamily = (stack, name) => (stack && stack.includes(name) ? 'sans-serif' : stack);
// When a font is replaced, anything that used the old name now uses the new one.
const swapFamily = (stack, from, to) => (from && stack && stack.includes(from) ? stackFor(to) : stack);

/** Upload an own font file. `onUpload(file)` must resolve to { url }. */
function FontUpload({ typography: t, onChange, onUpload, error }) {
  const uid = useId();
  const [picked, setPicked] = useState(null); // { file, ext, format, name }
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    setPicked(null); setProblem(''); setDone('');
    if (!file) return;
    try {
      const { ext, format } = await inspectFontFile(file);
      setPicked({ file, ext, format, name: familyFromFilename(file.name) });
    } catch (err) {
      setProblem(err.message);
      e.target.value = '';
    }
  };

  const upload = async () => {
    if (!isSafeFamilyName(picked.name)) { setProblem('Name the font using letters, numbers, spaces, hyphens or underscores.'); return; }
    setBusy(true); setProblem(''); setDone('');
    try {
      const { url } = await onUpload(picked.file);
      onChange({
        ...t, customFontName: picked.name, customFontUrl: url, fontFormat: picked.format,
        headingFont: swapFamily(t.headingFont, t.customFontName, picked.name), bodyFont: swapFamily(t.bodyFont, t.customFontName, picked.name),
      });
      setDone(`Uploaded "${picked.name}". Choose where to use it below.`);
      setPicked(null);
    } catch (err) {
      setProblem(err.userMessage || err.message || "Couldn't upload the font.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => onChange({
    ...t, customFontName: '', customFontUrl: '', fontFormat: '',
    headingFont: withoutFamily(t.headingFont, t.customFontName), bodyFont: withoutFamily(t.bodyFont, t.customFontName),
  });

  return (
    <section className="cms-card" aria-labelledby={`${uid}-up`}>
      <h2 id={`${uid}-up`}>Upload your own font</h2>
      <p className="cms-hint fm__lead">
        Add a .ttf, .otf, .woff or .woff2 file (up to {MAX_FONT_BYTES / 1024 / 1024} MB). Only upload fonts you have a licence to use on the web.
      </p>

      {!onUpload ? (
        <p className="cms-hint">Font uploads need the online database. Sign in with Supabase to use this.</p>
      ) : (
        <>
          <div className="cms-field">
            <label className="cms-label" htmlFor={`${uid}-file`}>Font file</label>
            <input id={`${uid}-file`} type="file" accept={FONT_ACCEPT} className="fm__file" onChange={pick} disabled={busy} />
          </div>
          {picked && (
            <div className="fm__pick">
              <div className="cms-field">
                <label className="cms-label" htmlFor={`${uid}-name`}>Font name</label>
                <input id={`${uid}-name`} className="cms-input" value={picked.name} spellCheck={false} onChange={(e) => setPicked({ ...picked, name: e.target.value })} />
                <p className="cms-hint">You will use this name in the heading and body fields.</p>
              </div>
              <button type="button" className="cms-btn cms-btn--primary" onClick={upload} disabled={busy}>
                {busy ? 'Uploading' : `Upload ${picked.file.name}`}
              </button>
            </div>
          )}
          <div aria-live="polite">
            {problem && <p className="cms-error" role="alert">{problem}</p>}
            {done && <p className="cms-hint fm__ok">{done}</p>}
          </div>
        </>
      )}

      {t.customFontUrl && (
        <div className="fm__family fm__custom">
          <span>
            <strong>{t.customFontName}</strong>
            <span className="cms-hint"> ({t.fontFormat}, uploaded)</span>
          </span>
          <span>
            <button type="button" className="cms-btn cms-btn--sm" onClick={() => onChange({ ...t, headingFont: stackFor(t.customFontName) })}>Use for headings</button>
            <button type="button" className="cms-btn cms-btn--sm" onClick={() => onChange({ ...t, bodyFont: stackFor(t.customFontName) })}>Use for body</button>
            <button type="button" className="cms-btn cms-btn--sm cms-btn--ghost-danger" onClick={remove}>Remove</button>
          </span>
        </div>
      )}
      {error && <p className="cms-error">{error}</p>}
    </section>
  );
}

/**
 * Typography settings for one project. value = { fontUrl, headingFont, bodyFont, customFontName, customFontUrl, fontFormat }.
 * Stylesheet links and the uploaded font are injected into <head> for live preview.
 * `onUploadFont(file) -> Promise<{ url }>` enables uploads (omit it to hide them).
 */
export default function FontManager({ value, onChange, errors = {}, onUploadFont }) {
  const uid = useId();
  const t = { ...DEFAULT_TYPOGRAPHY, ...value };
  const urls = useMemo(() => parseFontUrls(t.fontUrl), [t.fontUrl]);
  const statuses = useTypographyAssets(t);
  const families = useMemo(() => googleFamilies(urls), [urls]);
  const patch = (p) => onChange({ ...t, ...p });

  return (
    <div className="fm">
      <div className="fm__main">
        <FontUpload typography={t} onChange={onChange} onUpload={onUploadFont}
          error={errors['typography.customFontName'] || errors['typography.customFontUrl'] || errors['typography.fontFormat']} />

        <section className="cms-card" aria-labelledby={`${uid}-links`}>
          <h2 id={`${uid}-links`}>Font stylesheet links</h2>
          <p className="cms-hint fm__lead">
            Paste one link per line: a Google Fonts link, or the URL of a .css file that declares your @font-face rules. They load into the page straight away so you can preview them.
          </p>
          <div className="cms-field">
            <label className="cms-label" htmlFor={`${uid}-url`}>Stylesheet links</label>
            <textarea
              id={`${uid}-url`} className="cms-input bb-mono" rows={4} spellCheck={false}
              placeholder={'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap'}
              value={t.fontUrl} onChange={(e) => patch({ fontUrl: e.target.value })}
              aria-invalid={errors['typography.fontUrl'] ? 'true' : undefined}
              aria-describedby={errors['typography.fontUrl'] ? `${uid}-url-err` : undefined}
            />
            {errors['typography.fontUrl'] && <p id={`${uid}-url-err`} className="cms-error">{errors['typography.fontUrl']}</p>}
          </div>
          {urls.length > 0 && (
            <ul className="fm__status" aria-label="Link status">
              {urls.map((u) => {
                const st = statuses[u] || 'loading';
                const note = st === 'invalid' ? checkFontUrl(u) : STATUS[st][0];
                return (
                  <li key={u}>
                    <span className={`fm__dot ${STATUS[st][1]}`} aria-hidden="true" />
                    <span className="fm__url" title={u}>{u}</span>
                    <span className="fm__note">{note}</span>
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

        <section className="cms-card" aria-labelledby={`${uid}-fam`}>
          <h2 id={`${uid}-fam`}>Font families</h2>
          <p className="cms-hint fm__lead">Type the CSS family name exactly as the stylesheet defines it. Add a fallback after a comma.</p>
          <div className="cms-field">
            <label className="cms-label" htmlFor={`${uid}-h`}>Heading font</label>
            <input
              id={`${uid}-h`} list={`${uid}-dl`} className="cms-input" value={t.headingFont} spellCheck={false}
              placeholder={'"Playfair Display", serif'} onChange={(e) => patch({ headingFont: e.target.value })}
              aria-invalid={errors['typography.headingFont'] ? 'true' : undefined}
            />
            {errors['typography.headingFont'] && <p className="cms-error">{errors['typography.headingFont']}</p>}
          </div>
          <div className="cms-field">
            <label className="cms-label" htmlFor={`${uid}-b`}>Body font</label>
            <input
              id={`${uid}-b`} list={`${uid}-dl`} className="cms-input" value={t.bodyFont} spellCheck={false}
              placeholder="Inter, sans-serif" onChange={(e) => patch({ bodyFont: e.target.value })}
              aria-invalid={errors['typography.bodyFont'] ? 'true' : undefined}
            />
            {errors['typography.bodyFont'] && <p className="cms-error">{errors['typography.bodyFont']}</p>}
          </div>
          <datalist id={`${uid}-dl`}>
            {t.customFontName && <option value={stackFor(t.customFontName)} />}
            {families.map((f) => <option key={f} value={`${quoted(f)}, sans-serif`} />)}
            <option value="sans-serif" /><option value="serif" /><option value="monospace" />
          </datalist>

          {families.length > 0 && (
            <div className="fm__detected">
              <span className="cms-label">Found in your links</span>
              {families.map((f) => (
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
      </div>

      <aside className="fm__preview cms-card" aria-label="Typography preview" style={typographyStyle(t)}>
        <p className="cms-label">Live preview</p>
        <h3 className="fm__h">The quick brown fox jumps over the lazy dog</h3>
        <p className="fm__p">
          Body text sits in your chosen body font. A good pairing keeps headings expressive and paragraphs easy to read at length, even on a small screen.
        </p>
        <p className="fm__p"><strong>Bold text</strong>, <em>italic text</em> and numbers 0123456789.</p>
        <dl className="fm__stacks">
          <dt>Heading stack</dt><dd>{safeFontStack(t.headingFont)}{!isSafeFontStack(t.headingFont) && ' (invalid, using default)'}</dd>
          <dt>Body stack</dt><dd>{safeFontStack(t.bodyFont)}{!isSafeFontStack(t.bodyFont) && ' (invalid, using default)'}</dd>
        </dl>
      </aside>
    </div>
  );
}
