import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Chrome, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const appleLoginEnabled = import.meta.env.VITE_ENABLE_APPLE_LOGIN === 'true';

export default function Login() {
  const { signInWithProvider, authError } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [localError, setLocalError] = useState(null);

  const handleLogin = async (provider) => {
    setLocalError(null);
    setLoadingProvider(provider);
    const { error } = await signInWithProvider(provider);
    if (error) {
      setLocalError(error.message);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-5 overflow-hidden" style={{ background: '#01030b' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm glass-panel p-6 md:p-7 space-y-6"
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center glow-emerald">
            <LockKeyhole className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-grotesk text-3xl font-black text-white text-glow">
              FREEWAY
            </h1>
            <p className="font-mono text-[11px] text-primary/70 uppercase tracking-[0.28em] mt-1">
              accesso sicuro
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            onClick={() => handleLogin('google')}
            disabled={!isSupabaseConfigured || loadingProvider !== null}
            className="w-full h-12 rounded-xl gap-3 bg-white text-black hover:bg-white/90"
          >
            <Chrome className="w-5 h-5" />
            {loadingProvider === 'google' ? 'Apro Google...' : 'Continua con Google'}
          </Button>

          {appleLoginEnabled && (
            <Button
              type="button"
              onClick={() => handleLogin('apple')}
              disabled={!isSupabaseConfigured || loadingProvider !== null}
              variant="outline"
              className="w-full h-12 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              {loadingProvider === 'apple' ? 'Apro Apple...' : 'Continua con Apple'}
            </Button>
          )}
        </div>

        {!isSupabaseConfigured && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100 leading-relaxed">
            Configura `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` in `.env.local`,
            poi abilita Google e, se vuoi, Apple nei provider Supabase.
          </div>
        )}

        {(localError || authError?.message) && isSupabaseConfigured && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive-foreground leading-relaxed">
            {localError || authError.message}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
          Nessun accesso via email. Solo Google tramite Supabase.
        </p>
      </motion.div>
    </div>
  );
}
