import { createClient } from '@supabase/supabase-js';

// Recuperiamo le credenziali dalle variabili d'ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Controllo di sicurezza: se mancano le chiavi, l'app non crasha ma ti avvisa in console
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ ATTENZIONE: Chiavi Supabase non trovate! " +
    "Assicurati di averle inserite nelle Environment Variables su Vercel " +
    "o nel file .env.local per lo sviluppo."
  );
}

// Inizializzazione del client reale
export const supabase = createClient(supabaseUrl, supabaseAnonKey);