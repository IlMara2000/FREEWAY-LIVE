/**
 * Freeway Life - Supabase Auth Client
 * 
 * Usato solo per autenticazione. Le CRUD dei dati passano da databaseClient.js
 * che usa le stesse credenziali ma con fetch timeout e fallback offline.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Nessun fallback hardcoded - se mancano le env, l'app mostra la schermata di configurazione
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;