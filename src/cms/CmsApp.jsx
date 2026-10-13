import { useCallback, useEffect, useMemo, useState } from 'react';
import { ToastProvider, useToast } from './components/Toast.jsx';
import ProjectList from './components/ProjectList.jsx';
import ProjectEditor from './components/ProjectEditor.jsx';
import { FontLibraryPage } from '../components/FontManager.jsx';
import { collectUsedFamilies } from '../components/typography.js';
import Login from './components/Login.jsx';
import { localStorageStore } from './lib/projectsStore.js';
import { makeShowcaseProject } from './lib/seed.js';
import { buildHomeTemplate } from './lib/homeTemplate.js';

const SITE_URL = 'https://samuel-prah-portfolio.vercel.app';
const IMPORT_FLAG = 'portfolio.cms.import-dismissed';
const msg = (e, fallback) => e?.userMessage || fallback;

function CmsShell({ store, user, onSignOut }) {
  const toast = useToast();
  const [projects, setProjects] = useState(null);
  const [view, setView] = useState({ name: 'list' }); // { name: 'list' } | { name: 'edit', project?: Project }
  const [saving, setSaving] = useState(false);
  const [importable, setImportable] = useState([]);
  const [fonts, setFonts] = useState([]);

  useEffect(() => {
    store.listFonts?.().then(setFonts).catch((e) => toast.error(msg(e, "Couldn't load the font library.")));
  }, [store, toast]);

  // The font library, shared by every page. Uploads need the Supabase store.
  const library = useMemo(() => {
    const byName = (a, b) => a.family.localeCompare(b.family) || a.weight - b.weight || a.style.localeCompare(b.style);
    return {
      enabled: !!store.addFont,
      fonts,
      add: async (meta) => { const font = await store.addFont(meta); setFonts((all) => [...all, font].sort(byName)); return font; },
      remove: async (font) => { await store.deleteFont(font); setFonts((all) => all.filter((f) => f.id !== font.id)); },
    };
  }, [store, fonts]);

  const usageOf = useCallback(
    (family) => (projects || []).filter((p) => collectUsedFamilies(p.blocks, p.typography).has(family.toLowerCase())).length,
    [projects]
  );

  useEffect(() => {
    store.list().then(setProjects).catch((e) => { setProjects([]); toast.error(msg(e, "Couldn't load your projects.")); });
  }, [store, toast]);

  // Offer to move projects saved in this browser into the database (only when the store supports it).
  useEffect(() => {
    if (!store.importProjects || localStorage.getItem(IMPORT_FLAG)) return;
    setImportable(localStorageStore.peek());
  }, [store]);

  const save = useCallback(async (data) => {
    setSaving(true);
    try {
      const previous = projects?.find((p) => p.id === data.id);
      const saved = await store.save(data);
      // The old font file is only deleted once the project no longer points at it.
      const oldFont = previous?.typography?.customFontUrl;
      // Never delete a file the font library still points at.
      if (oldFont && oldFont !== saved.typography?.customFontUrl && !fonts.some((f) => f.fileUrl === oldFont)) store.removeFont?.(oldFont).catch(() => {});
      setProjects((all) => (all.some((p) => p.id === saved.id) ? all.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...all]));
      toast.success(`"${saved.title}" saved.`);
      setView({ name: 'list' });
    } catch (e) {
      toast.error(msg(e, "Couldn't save the project. Try again."));
    } finally {
      setSaving(false);
    }
  }, [projects, fonts, store, toast]);

  const remove = useCallback(async (project) => {
    try {
      await store.remove(project.id);
      if (project.typography?.customFontUrl && !fonts.some((f) => f.fileUrl === project.typography.customFontUrl)) store.removeFont?.(project.typography.customFontUrl).catch(() => {});
      setProjects((all) => all.filter((p) => p.id !== project.id));
      toast.success(`"${project.title}" deleted.`);
    } catch (e) {
      toast.error(msg(e, "Couldn't delete the project. Try again."));
    }
  }, [fonts, store, toast]);

  const toggleStatus = useCallback(async (project) => {
    const next = project.status === 'published' ? 'draft' : 'published';
    try {
      const updated = await store.setStatus(project.id, next);
      setProjects((all) => all.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(next === 'published' ? `"${project.title}" is now published.` : `"${project.title}" moved to draft.`);
    } catch (e) {
      toast.error(msg(e, "Couldn't change the status. Try again."));
    }
  }, [store, toast]);

  const addShowcase = useCallback(async () => {
    const draft = makeShowcaseProject();
    let slug = draft.slug;
    for (let n = 2; projects.some((p) => p.slug === slug); n += 1) slug = `${draft.slug}-${n}`;
    try {
      const saved = await store.save({ ...draft, slug });
      setProjects((all) => [saved, ...all]);
      toast.success('Added a draft test page with one of every block.');
    } catch (e) {
      toast.error(msg(e, "Couldn't add the test page."));
    }
  }, [projects, store, toast]);

  const runImport = useCallback(async () => {
    try {
      const added = await store.importProjects(importable);
      localStorage.setItem(IMPORT_FLAG, '1');
      setImportable([]);
      setProjects(await store.list());
      const skipped = importable.length - added.length;
      toast.success(`Imported ${added.length} ${added.length === 1 ? 'project' : 'projects'}${skipped ? `, skipped ${skipped} that already existed` : ''}.`);
    } catch (e) {
      toast.error(msg(e, "Couldn't import your projects."));
    }
  }, [importable, store, toast]);

  const dismissImport = () => { localStorage.setItem(IMPORT_FLAG, '1'); setImportable([]); };

  const exportPublished = useCallback(() => {
    const data = projects.filter((p) => p.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'projects.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Exported ${data.length} published ${data.length === 1 ? 'project' : 'projects'}.`);
  }, [projects, toast]);

  return (
    <div className="cms">
      <header className="cms-bar">
        <div className="cms-wrap cms-bar__inner">
          <span className="cms-brand">Samuel Prah <span className="cms-muted">CMS</span></span>
          <div className="cms-bar__actions">
            {user && <span className="cms-muted cms-bar__user">{user}</span>}
            <a className="cms-btn cms-btn--sm" href={SITE_URL} target="_blank" rel="noopener noreferrer">View site</a>
            {onSignOut && <button type="button" className="cms-btn cms-btn--sm" onClick={onSignOut}>Sign out</button>}
          </div>
        </div>
      </header>
      <main className="cms-wrap cms-main">
        {importable.length > 0 && view.name === 'list' && (
          <div className="cms-banner" role="region" aria-label="Import projects">
            <p>
              <strong>{importable.length} {importable.length === 1 ? 'project is' : 'projects are'} saved only in this browser.</strong>{' '}
              Move {importable.length === 1 ? 'it' : 'them'} to your online database so they show up everywhere.
            </p>
            <div className="cms-banner__actions">
              <button type="button" className="cms-btn cms-btn--sm cms-btn--primary" onClick={runImport}>Import {importable.length}</button>
              <button type="button" className="cms-btn cms-btn--sm" onClick={dismissImport}>Don't ask again</button>
            </div>
          </div>
        )}
        {projects === null ? (
          <p className="cms-muted" role="status">Loading projects</p>
        ) : view.name === 'list' ? (
          <ProjectList
            projects={projects}
            onCreate={() => setView({ name: 'edit' })}
            onEdit={(project) => setView({ name: 'edit', project })}
            onOpenFonts={() => setView({ name: 'fonts' })}
            onEditHome={() => {
              const home = projects.find((p) => p.slug === 'home');
              // First time: start from the current landing page, already converted into blocks.
              setView(home ? { name: 'edit', project: home } : { name: 'edit', template: buildHomeTemplate() });
            }}
            onDelete={remove}
            onToggleStatus={toggleStatus}
            onExport={exportPublished}
            onAddShowcase={addShowcase}
          />
        ) : view.name === 'fonts' ? (
          <FontLibraryPage library={library} usageOf={usageOf} onBack={() => setView({ name: 'list' })} />
        ) : (
          <ProjectEditor
            key={view.project?.id ?? view.template?.slug ?? 'new'}
            project={view.project}
            template={view.template}
            library={library}
            usageOf={usageOf}
            projects={projects}
            saving={saving}
            onSave={save}
            onCancel={() => setView({ name: 'list' })}
          />
        )}
      </main>
    </div>
  );
}

function AuthGate({ auth, children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  useEffect(() => {
    let live = true;
    auth.getSession().then((s) => live && setSession(s));
    const off = auth.onChange((s) => setSession(s));
    return () => { live = false; off(); };
  }, [auth]);

  if (session === undefined) return <p className="cms-muted cms-wrap cms-main" role="status">Loading</p>;
  if (!session) return <Login onSignIn={auth.signIn} />;
  return children(session);
}

/**
 * Drop-in CMS. `store` is the data layer. Pass `auth` (getSession, onChange, signIn, signOut) to require a login.
 */
export default function CmsApp({ store = localStorageStore, auth = null }) {
  return (
    <ToastProvider>
      {auth
        ? <AuthGate auth={auth}>{(session) => <CmsShell store={store} user={session.user.email} onSignOut={auth.signOut} />}</AuthGate>
        : <CmsShell store={store} />}
    </ToastProvider>
  );
}
