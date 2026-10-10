import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** null when the env vars are empty, so the CMS falls back to LocalStorage. */
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
export const hasSupabase = !!supabase;
