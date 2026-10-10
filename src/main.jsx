import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CmsApp from './cms/CmsApp.jsx';
import { localStorageStore } from './cms/lib/projectsStore.js';
import { supabaseStore } from './cms/lib/supabaseStore.js';
import { supabaseAuth } from './cms/lib/auth.js';
import { hasSupabase } from './cms/lib/supabaseClient.js';
import './cms/cms.css';

// With Supabase configured (.env) the CMS needs a login and saves online. Otherwise it runs on LocalStorage.
const props = hasSupabase ? { store: supabaseStore, auth: supabaseAuth } : { store: localStorageStore };

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CmsApp {...props} />
  </StrictMode>
);
