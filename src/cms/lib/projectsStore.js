import { buildSeedProjects } from './seed.js';
import { DEFAULT_TYPOGRAPHY } from '../../components/typography.js';
import { newBlockId } from '../../components/builder/blockTree.js';

/**
 * Data layer (LocalStorage). Every method returns a Promise so it can be swapped for a real backend.
 *   list() -> Project[]      save(project) -> Project (creates when `id` is missing)
 *   remove(id) -> void       setStatus(id, status) -> Project
 *
 * Project: { id, title, slug, summary, coverUrl, liveUrl, categories, status, createdAt,
 *            typography: { fontUrl, headingFont, bodyFont }, blocks: [{ id, type, props }] }
 */
const KEY = 'portfolio.cms.projects.v2';
const LEGACY_KEY = 'portfolio.cms.projects.v1';

/** Upgrades older saved projects: coverImageUrl -> coverUrl, Markdown body -> a Text Editor block, adds typography. */
export function migrateProject(p) {
  const { coverImageUrl, body, ...rest } = p;
  const blocks = Array.isArray(p.blocks)
    ? p.blocks
    : body && body.trim()
      ? [{ id: newBlockId(), type: 'text', props: { content: body, align: 'left', columns: '1' } }]
      : [];
  return { ...rest, coverUrl: p.coverUrl ?? coverImageUrl ?? '', typography: { ...DEFAULT_TYPOGRAPHY, ...(p.typography || {}) }, blocks };
}

const write = (projects) => localStorage.setItem(KEY, JSON.stringify(projects));

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      const list = legacy ? JSON.parse(legacy).map(migrateProject) : buildSeedProjects();
      write(list);
      return list;
    }
    const stored = JSON.parse(raw);
    const migrated = stored.map(migrateProject);
    if (JSON.stringify(migrated) !== raw) write(migrated);
    return migrated;
  } catch {
    return [];
  }
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** Reads what is saved in this browser without creating sample data. Used to offer an import into Supabase. */
const peek = () => {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw).map(migrateProject) : [];
  } catch {
    return [];
  }
};

export const localStorageStore = {
  peek,
  async list() {
    return read();
  },
  async save(project) {
    const all = read();
    const saved = project.id ? project : { ...project, id: newId() };
    write(all.some((p) => p.id === saved.id) ? all.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...all]);
    return saved;
  },
  async remove(id) {
    write(read().filter((p) => p.id !== id));
  },
  async setStatus(id, status) {
    const next = read().map((p) => (p.id === id ? { ...p, status } : p));
    write(next);
    return next.find((p) => p.id === id);
  },
};
