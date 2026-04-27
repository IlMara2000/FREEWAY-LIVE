import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://rivxgikyzdppnmmrwyfp.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_Y2ONra-54r2mJiuKa00l-w_7WLXAdhk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

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
