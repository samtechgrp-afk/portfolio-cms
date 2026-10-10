import { supabase } from './supabaseClient.js';

/**
 * Supabase data layer. Same interface as the LocalStorage store:
 *   list() save(project) remove(id) setStatus(id, status)
 * plus importProjects(list) for moving browser-saved projects into the database.
 * Row-level security decides who may write, so a failed write usually means "not signed in as the owner".
 */
const COLUMNS = 'id,title,slug,summary,cover_url,live_url,categories,status,created_at,typography,blocks';

const toApp = (r) => ({
  id: r.id, title: r.title, slug: r.slug, summary: r.summary, coverUrl: r.cover_url, liveUrl: r.live_url,
  categories: r.categories, status: r.status, createdAt: r.created_at, typography: r.typography, blocks: r.blocks,
});
const toDb = (p) => ({
  title: p.title, slug: p.slug, summary: p.summary, cover_url: p.coverUrl, live_url: p.liveUrl,
  categories: p.categories, status: p.status, created_at: p.createdAt, typography: p.typography, blocks: p.blocks,
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error, fallback) {
  const e = new Error(fallback);
  if (error?.code === '23505') e.userMessage = 'Another project already uses this slug.';
  else if (error?.code === '42501' || error?.code === 'PGRST116') e.userMessage = "You don't have permission to do that. Sign in as the site owner.";
  else if (error?.message && /fetch|network/i.test(error.message)) e.userMessage = "Couldn't reach the database. Check your connection.";
  e.cause = error;
  throw e;
}

export const supabaseStore = {
  async list() {
    const { data, error } = await supabase.from('projects').select(COLUMNS).order('created_at', { ascending: false }).order('title');
    if (error) fail(error, "Couldn't load your projects.");
    return data.map(toApp);
  },
  async save(project) {
    const row = toDb(project);
    const q = project.id && UUID.test(project.id)
      ? supabase.from('projects').update(row).eq('id', project.id)
      : supabase.from('projects').insert(row);
    const { data, error } = await q.select(COLUMNS).single();
    if (error) fail(error, "Couldn't save the project.");
    return toApp(data);
  },
  async remove(id) {
    const { data, error } = await supabase.from('projects').delete().eq('id', id).select('id');
    if (error) fail(error, "Couldn't delete the project.");
    if (!data.length) fail({ code: '42501' }, "Couldn't delete the project.");
  },
  async setStatus(id, status) {
    const { data, error } = await supabase.from('projects').update({ status }).eq('id', id).select(COLUMNS).single();
    if (error) fail(error, "Couldn't change the status.");
    return toApp(data);
  },
  /** Inserts projects that don't exist yet (matched by slug). Returns the rows that were added. */
  async importProjects(list) {
    const { data, error } = await supabase
      .from('projects')
      .upsert(list.map(toDb), { onConflict: 'slug', ignoreDuplicates: true })
      .select(COLUMNS);
    if (error) fail(error, "Couldn't import the projects.");
    return data.map(toApp);
  },
};
