import { useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog.jsx';
import { formatDate } from '../lib/format.js';
import { countBlocks } from '../../components/builder/blockTree.js';

const SORTERS = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  title: (a, b) => a.title.localeCompare(b.title),
};

export default function ProjectList({ projects, onCreate, onEdit, onEditHome, onOpenFonts, onOpenSettings, onDelete, onToggleStatus, onExport, onAddShowcase }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [pendingDelete, setPendingDelete] = useState(null);

  const categories = useMemo(() => [...new Set(projects.flatMap((p) => p.categories))].sort(), [projects]);
  const published = projects.filter((p) => p.status === 'published').length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => status === 'all' || p.status === status)
      .filter((p) => category === 'all' || p.categories.includes(category))
      .filter((p) => !q || [p.title, p.slug, p.summary, ...p.categories].join(' ').toLowerCase().includes(q))
      .sort(SORTERS[sort]);
  }, [projects, query, status, category, sort]);

  const filtering = query || status !== 'all' || category !== 'all';
  const clearFilters = () => { setQuery(''); setStatus('all'); setCategory('all'); };

  return (
    <section aria-labelledby="list-title">
      <div className="cms-pagehead">
        <div>
          <h1 id="list-title">Projects</h1>
          <p className="cms-muted">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}, {published} published, {projects.length - published} in draft.
          </p>
        </div>
        <div className="cms-pagehead__actions">
          <button type="button" className="cms-btn" onClick={onEditHome}>Edit home page</button>
          <button type="button" className="cms-btn" onClick={onOpenFonts}>Font library</button>
          <button type="button" className="cms-btn" onClick={onOpenSettings}>Site settings</button>
          <button type="button" className="cms-btn" onClick={onAddShowcase}>Add test page (all blocks)</button>
          <button type="button" className="cms-btn" onClick={onExport} disabled={!published}>Export published (JSON)</button>
          <button type="button" className="cms-btn cms-btn--primary" onClick={onCreate}>New project</button>
        </div>
      </div>

      <div className="cms-toolbar" role="search">
        <input
          type="search"
          className="cms-input cms-toolbar__search"
          placeholder="Search title, slug, summary or category"
          aria-label="Search projects"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="cms-input" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select className="cms-input" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="cms-input" aria-label="Sort projects" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title, A to Z</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="cms-empty">
          {projects.length === 0 ? (
            <>
              <h2>No projects yet</h2>
              <p>Add your first project to get started.</p>
              <button type="button" className="cms-btn cms-btn--primary" onClick={onCreate}>New project</button>
            </>
          ) : (
            <>
              <h2>No projects match</h2>
              <p>Try a different search or clear the filters.</p>
              {filtering && <button type="button" className="cms-btn" onClick={clearFilters}>Clear filters</button>}
            </>
          )}
        </div>
      ) : (
        <div className="cms-tablewrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th scope="col"><span className="cms-sr">Cover</span></th>
                <th scope="col">Project</th>
                <th scope="col">Categories</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col"><span className="cms-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td data-label="Cover">
                    <div className="cms-thumb">
                      {p.coverUrl ? (
                        <img src={p.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : null}
                    </div>
                  </td>
                  <td data-label="Project" className="cms-table__main">
                    <button type="button" className="cms-linkbtn" onClick={() => onEdit(p)}>{p.title}</button>
                    {p.slug === 'home' && <span className="cms-badge cms-badge--home">Home page</span>}
                    <span className="cms-muted cms-slug">/{p.slug}</span>
                    <span className="cms-muted cms-slug">{countBlocks(p.blocks)} {countBlocks(p.blocks) === 1 ? 'block' : 'blocks'}</span>
                  </td>
                  <td data-label="Categories">
                    <div className="cms-chips">
                      {p.categories.length ? p.categories.map((c) => <span key={c} className="cms-chip">{c}</span>) : <span className="cms-muted">None</span>}
                    </div>
                  </td>
                  <td data-label="Status">
                    <span className={`cms-badge cms-badge--${p.status}`}>{p.status === 'published' ? 'Published' : 'Draft'}</span>
                  </td>
                  <td data-label="Created" className="cms-nowrap">{formatDate(p.createdAt)}</td>
                  <td className="cms-actions">
                    <div className="cms-actions__row">
                    <button type="button" className="cms-btn cms-btn--sm" onClick={() => onEdit(p)}>Edit</button>
                    <button type="button" className="cms-btn cms-btn--sm" onClick={() => onToggleStatus(p)}>
                      {p.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" className="cms-btn cms-btn--sm cms-btn--ghost-danger" onClick={() => setPendingDelete(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this project?"
        message={pendingDelete ? `"${pendingDelete.title}" will be removed permanently. This can't be undone.` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { onDelete(pendingDelete); setPendingDelete(null); }}
      />
    </section>
  );
}
