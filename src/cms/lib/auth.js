import { supabase } from './supabaseClient.js';

/** Small auth adapter so the UI doesn't depend on Supabase directly. */
export const supabaseAuth = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  onChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That email or password is not right.' : error.message);
  },
  async signOut() {
    await supabase.auth.signOut();
  },
};
