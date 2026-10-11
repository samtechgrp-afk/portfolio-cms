import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Field from './Field.jsx';
import TagInput from './TagInput.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import FontManager from '../../components/FontManager.jsx';
import {
  BlockCanvas, BlockPickerModal, PageRenderer, PropertyInspector, cloneBlock, countBlocks, createBlock,
  findBlock, insertAfter, insertBlock, moveBlock, moveTo, patchProps, removeBlock, toggleHidden,
} from '../../components/builder/index.js';
import { BuilderContext } from '../../components/builder/BuilderContext.jsx';
import { Icon } from '../../components/builder/icons.jsx';
import { DEFAULT_TYPOGRAPHY, parseFontUrls, useTypographyAssets } from '../../components/typography.js';
import { slugify, validateProject } from '../lib/validation.js';
import { today } from '../lib/format.js';

const EMPTY = {
  title: '', slug: '', summary: '', coverUrl: '', liveUrl: '', categories: [], status: 'draft',
};
const TABS = [['details', 'Details'], ['typography', 'Typography'], ['builder', 'Page builder'], ['preview', 'Preview']];
const DEVICES = [['desktop', 'Desktop', '100%'], ['tablet', 'Tablet', 768], ['mobile', 'Mobile', 390]];

const HOME_SLUG = 'home';

/**
 * `template` pre-fills a new project (used for the Home page). `library` is the shared font library.
 */
export default function ProjectEditor({ project, projects, saving, onSave, onCancel, template, library, usageOf }) {
  const isNew = !project;
  const initial = useRef(project ? { ...project } : { ...EMPTY, createdAt: today(), typography: { ...DEFAULT_TYPOGRAPHY }, blocks: [], ...template });
  const [values, setValues] = useState(initial.current);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!isNew || !!template?.slug);
  const [tab, setTab] = useState('details');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [picker, setPicker] = useState({ open: false, target: null });
  const [history, setHistory] = useState([]);
  const [device, setDevice] = useState('desktop');
  const formRef = useRef(null);
  const blocksRef = useRef(values.blocks);
  blocksRef.current = values.blocks;

  useTypographyAssets(values.typography, { fonts: library.fonts, blocks: values.blocks });

  const errors = useMemo(() => validateProject(values, projects), [values, projects]);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial.current);
  const suggestions = useMemo(() => [...new Set(projects.flatMap((p) => p.categories))].sort(), [projects]);
  const err = (field) => ((touched[field] || submitted) ? errors[field] : undefined);
  const selected = selectedId ? findBlock(values.blocks, selectedId) : null;

  useEffect(() => setCoverBroken(false), [values.coverUrl]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const set = (name, value) =>
    setValues((v) => {
      const next = { ...v, [name]: value };
      if (name === 'title' && !slugEdited) next.slug = slugify(value);
      return next;
    });
  const blur = (name) => () => setTouched((t) => ({ ...t, [name]: true }));

  /* ---- block operations. Structural changes are recorded so Undo can step back. ---- */
  const commit = useCallback((next) => {
    const cur = blocksRef.current;
    if (next === cur) return;
    setHistory((h) => [...h.slice(-49), cur]);
    blocksRef.current = next;
    setValues((v) => ({ ...v, blocks: next }));
    setSelectedId((id) => (id && !findBlock(next, id) ? null : id));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      blocksRef.current = prev;
      setValues((v) => ({ ...v, blocks: prev }));
      setSelectedId((id) => (id && !findBlock(prev, id) ? null : id));
      return h.slice(0, -1);
    });
  }, []);

  const addBlock = (type) => {
    const block = createBlock(type);
    commit(insertBlock(blocksRef.current, picker.target, block));
    setSelectedId(block.id);
    setPicker({ open: false, target: null });
  };
  const duplicate = (id) => {
    const src = findBlock(blocksRef.current, id);
    if (!src) return;
    const copy = cloneBlock(src);
    commit(insertAfter(blocksRef.current, id, copy));
    setSelectedId(copy.id);
  };
  const patchSelected = (patch) => setValues((v) => ({ ...v, blocks: patchProps(v.blocks, selectedId, patch) }));

  useEffect(() => {
    if (tab !== 'builder') return undefined;
    const onKey = (e) => {
      const el = e.target;
      const typing = el.matches?.('input, textarea, select, [contenteditable="true"]');
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, undo]);

  /* ---- save ---- */
  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const keys = Object.keys(errors);
    if (keys.length) {
      setTab(keys.every((k) => k.startsWith('typography')) ? 'typography' : 'details');
      requestAnimationFrame(() => requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus()));
      return;
    }
    onSave({
      ...values,
      title: values.title.trim(),
      summary: values.summary.trim(),
      categories: values.categories.map((c) => c.trim()).filter(Boolean),
      coverUrl: values.coverUrl.trim(),
      liveUrl: values.liveUrl.trim(),
      typography: { ...values.typography, fontUrl: parseFontUrls(values.typography.fontUrl).join('\n') },
    });
  };

  const cancel = () => (dirty ? setConfirmLeave(true) : onCancel());
  const blockCount = countBlocks(values.blocks);
  const tabKeys = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex(([id]) => id === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length][0];
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
  };

  return (
    <section aria-labelledby="edit-title">
      <div className="cms-pagehead">
        <div>
          <button type="button" className="cms-linkbtn cms-back" onClick={cancel}>Back to projects</button>
          <h1 id="edit-title">{values.slug === HOME_SLUG ? 'Home page' : isNew ? 'New project' : 'Edit project'}</h1>
        </div>
      </div>

      {/* Enter inside a field must not save the whole project by accident. */}
      <form ref={formRef} className="cms-editor" onSubmit={submit} noValidate
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}>

        <div className="cms-maintabs" role="tablist" aria-label="Editor sections" onKeyDown={tabKeys}>
          {TABS.map(([id, label]) => (
            <button
              type="button" role="tab" key={id} id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}
            >
              {label}
              {id === 'builder' && <span className="cms-maintabs__count">{blockCount}</span>}
              {id === 'details' && submitted && Object.keys(errors).some((k) => !k.startsWith('typography')) && <span className="cms-maintabs__dot" aria-label="has errors" />}
              {id === 'typography' && Object.keys(errors).some((k) => k.startsWith('typography')) && <span className="cms-maintabs__dot" aria-label="has errors" />}
            </button>
          ))}
        </div>

        {tab === 'details' && (
          <div role="tabpanel" id="panel-details" aria-labelledby="tab-details" className="cms-editor__grid">
            <div className="cms-editor__main">
              <Field label="Title" required error={err('title')}>
                {(p) => <input {...p} className="cms-input" value={values.title} maxLength={140} onChange={(e) => set('title', e.target.value)} onBlur={blur('title')} autoFocus={isNew} />}
              </Field>
              <Field label="Slug" required error={err('slug')}
                hint={initial.current.slug === HOME_SLUG
                  ? 'This is your home page. When it is published with at least one block, it replaces the default layout on the main page of your site.'
                  : `Used in the project link: /work/${values.slug || 'your-slug'}`}>
                {(p) => <input {...p} className="cms-input" value={values.slug} readOnly={initial.current.slug === HOME_SLUG}
                  onChange={(e) => { setSlugEdited(true); set('slug', slugify(e.target.value)); }} onBlur={blur('slug')} />}
              </Field>
              <Field label="Summary" error={err('summary')} hint={`${values.summary.length} of 200 characters`}>
                {(p) => <textarea {...p} className="cms-input" rows={4} value={values.summary} onChange={(e) => set('summary', e.target.value)} onBlur={blur('summary')} />}
              </Field>
              <p className="cms-hint">The page content lives in the <button type="button" className="cms-linkbtn" onClick={() => setTab('builder')}>Page builder</button> tab, and the fonts in the <button type="button" className="cms-linkbtn" onClick={() => setTab('typography')}>Typography</button> tab.</p>
            </div>

            <aside className="cms-editor__side">
              <div className="cms-card">
                <Field label="Status" error={err('status')}>
                  {(p) => (
                    <select {...p} className="cms-input" value={values.status} onChange={(e) => set('status', e.target.value)}>
                      <option value="draft">Draft (hidden from the site)</option>
                      <option value="published">Published</option>
                    </select>
                  )}
                </Field>
                <Field label="Created" required error={err('createdAt')}>
                  {(p) => <input {...p} type="date" className="cms-input" value={values.createdAt} onChange={(e) => set('createdAt', e.target.value)} onBlur={blur('createdAt')} />}
                </Field>
              </div>
              <div className="cms-card">
                <Field label="Categories" error={err('categories')} hint="Press Enter or comma to add. Up to 8.">
                  {(p) => <TagInput {...p} value={values.categories} suggestions={suggestions} onChange={(c) => set('categories', c)} />}
                </Field>
              </div>
              <div className="cms-card">
                <Field label="Cover image link" error={err('coverUrl')} hint="A public https:// image link.">
                  {(p) => <input {...p} type="url" inputMode="url" className="cms-input" placeholder="https://" value={values.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} onBlur={blur('coverUrl')} />}
                </Field>
                {values.coverUrl && !errors.coverUrl && (
                  <div className="cms-cover">
                    {coverBroken
                      ? <p className="cms-hint">This image couldn't be loaded. Check the link and that it's public.</p>
                      : <img src={values.coverUrl} alt="Cover preview" referrerPolicy="no-referrer" onError={() => setCoverBroken(true)} />}
                  </div>
                )}
                <Field label="Live link" error={err('liveUrl')} hint="Where the finished work can be seen.">
                  {(p) => <input {...p} type="url" inputMode="url" className="cms-input" placeholder="https://" value={values.liveUrl} onChange={(e) => set('liveUrl', e.target.value)} onBlur={blur('liveUrl')} />}
                </Field>
              </div>
            </aside>
          </div>
        )}

        {tab === 'typography' && (
          <div role="tabpanel" id="panel-typography" aria-labelledby="tab-typography">
            <FontManager value={values.typography} onChange={(t) => set('typography', t)} errors={errors} library={library} usageOf={usageOf} />
          </div>
        )}

        {tab === 'builder' && (
          <div role="tabpanel" id="panel-builder" aria-labelledby="tab-builder">
            <BuilderContext.Provider value={{ fonts: library.fonts, projects }}>
            <div className="bb-workspace">
              <div>
                <div className="bb-toolbar">
                  <p className="cms-muted">{blockCount} {blockCount === 1 ? 'block' : 'blocks'}. Click a block to edit it.</p>
                  <div className="bb-toolbar__actions">
                    <button type="button" className="cms-btn cms-btn--sm" onClick={undo} disabled={!history.length}><Icon name="undo" size={14} /> Undo</button>
                    <button type="button" className="cms-btn cms-btn--sm cms-btn--primary" onClick={() => setPicker({ open: true, target: null })}><Icon name="plus" size={14} /> Add block</button>
                  </div>
                </div>
                <div className="bb-canvaswrap">
                  <BlockCanvas
                    blocks={values.blocks} typography={values.typography} title={values.title} fonts={library.fonts}
                    selectedId={selectedId} onSelect={setSelectedId}
                    onAdd={(target) => setPicker({ open: true, target })}
                    onMove={(id, dir) => commit(moveBlock(blocksRef.current, id, dir))}
                    onDuplicate={duplicate}
                    onToggleHidden={(id) => commit(toggleHidden(blocksRef.current, id))}
                    onDropBlock={(id, target, index) => commit(moveTo(blocksRef.current, id, target, index))}
                    onDelete={(id) => commit(removeBlock(blocksRef.current, id))}
                  />
                </div>
              </div>
              <PropertyInspector
                block={selected} onChange={patchSelected} onClose={() => setSelectedId(null)}
                onDuplicate={() => duplicate(selectedId)} onToggleHidden={() => commit(toggleHidden(blocksRef.current, selectedId))} onDelete={() => commit(removeBlock(blocksRef.current, selectedId))}
              />
            </div>
            <BlockPickerModal open={picker.open} onPick={addBlock} onClose={() => setPicker({ open: false, target: null })} />
            </BuilderContext.Provider>
          </div>
        )}

        {tab === 'preview' && (
          <div role="tabpanel" id="panel-preview" aria-labelledby="tab-preview">
            <div className="bb-previewbar">
              <div className="bb-devices" role="group" aria-label="Preview width">
                {DEVICES.map(([id, label]) => <button type="button" key={id} aria-pressed={device === id} onClick={() => setDevice(id)}>{label}</button>)}
              </div>
              <p className="cms-muted">This is how the page will look, with your fonts and live embeds.</p>
            </div>
            <div className="bb-previewframe" style={{ maxWidth: DEVICES.find(([id]) => id === device)[2] }}>
              <PageRenderer blocks={values.blocks} typography={values.typography} title={values.title} fonts={library.fonts} />
            </div>
          </div>
        )}

        <div className="cms-savebar">
          <p className="cms-muted" aria-live="polite">
            {submitted && Object.keys(errors).length ? 'Fix the highlighted fields to save.' : dirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </p>
          <div className="cms-savebar__actions">
            <button type="button" className="cms-btn" onClick={cancel}>Cancel</button>
            <button type="submit" className="cms-btn cms-btn--primary" disabled={saving}>{saving ? 'Saving' : isNew ? 'Create project' : 'Save changes'}</button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmLeave} title="Discard your changes?" message="You have unsaved edits. If you leave now they will be lost."
        confirmLabel="Discard changes" onCancel={() => setConfirmLeave(false)} onConfirm={() => { setConfirmLeave(false); onCancel(); }}
      />
    </section>
  );
}
