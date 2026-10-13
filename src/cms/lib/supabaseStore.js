import { supabase } from './supabaseClient.js';
import { FONT_MIME, fontExtension } from '../../components/typography.js';

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
const FONT_COLUMNS = 'id,family,file_url,storage_path,format,weight,style';
const toFont = (r) => ({ id: r.id, family: r.family, fileUrl: r.file_url, storagePath: r.storage_path, format: r.format, weight: r.weight, style: r.style });

/** Uploads a font file to the public `fonts` bucket under a random name, so files never overwrite each other. */
async function uploadFontFile(file) {
  const ext = fontExtension(file.name);
  const path = `${crypto.randomUUID()}.${ext}`;
  // Windows and some other systems label font files with older or empty MIME types. The browser sends that label to
  // Storage, which rejects it. Re-wrapping the same bytes with the standard font type avoids that.
  const typed = new File([file], file.name, { type: FONT_MIME[ext] });
  const { error } = await supabase.storage.from('fonts').upload(path, typed, { contentType: FONT_MIME[ext], cacheControl: '31536000', upsert: false });
  if (error) fail(error, "Couldn't upload the font.");
  return { url: supabase.storage.from('fonts').getPublicUrl(path).data.publicUrl, path };
}
const removeFontFile = async (path) => { if (path) await supabase.storage.from('fonts').remove([decodeURIComponent(path)]); };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error, fallback) {
  const e = new Error(fallback);
  if (error?.code === '23505') e.userMessage = 'Another project already uses this slug.';
  else if (error?.code === '42501' || error?.code === 'PGRST116') e.userMessage = "You don't have permission to do that. Sign in as the site owner.";
  else if (error?.message && /fetch|network/i.test(error.message)) e.userMessage = "Couldn't reach the database. Check your connection.";
  // Anything else: show what the server actually said, so a failure can be diagnosed instead of guessed at.
  else if (error?.message) e.userMessage = `${fallback} (${error.message})`;
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
  /** Uploads a font file to the public `fonts` bucket. Returns { url, path }. Names are random, so files never overwrite each other. */
  uploadFont: uploadFontFile,
  /** Deletes a previously uploaded font by its public URL. Best effort: a leftover file is harmless. */
  async removeFont(url) {
    await removeFontFile(url?.split('/storage/v1/object/public/fonts/')[1]);
  },

  /* ---- font library: one row per font file (a "face"); faces sharing a family name form one family ---- */
  async listFonts() {
    const { data, error } = await supabase.from('fonts').select(FONT_COLUMNS).order('family').order('weight').order('style');
    if (error) fail(error, "Couldn't load the font library.");
    return data.map(toFont);
  },
  /** Uploads the file, then records it. If recording fails, the uploaded file is removed again. */
  async addFont({ file, family, weight = 400, style = 'normal', format }) {
    const { url, path } = await uploadFontFile(file);
    const { data, error } = await supabase.from('fonts')
      .insert({ family, file_url: url, storage_path: path, format, weight, style }).select(FONT_COLUMNS).single();
    if (error) {
      await removeFontFile(path).catch(() => {});
      if (error.code === '23505') { const e = new Error('duplicate'); e.userMessage = `${family} ${weight} ${style} is already in the library.`; throw e; }
      fail(error, "Couldn't save the font.");
    }
    return toFont(data);
  },
  async deleteFont(font) {
    const { error } = await supabase.from('fonts').delete().eq('id', font.id);
    if (error) fail(error, "Couldn't delete the font.");
    await removeFontFile(font.storagePath).catch(() => {}); // a leftover file is harmless
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
