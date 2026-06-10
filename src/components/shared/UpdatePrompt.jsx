/**
 * Freeway Life - Update Prompt
 * 
 * Mostra un banner quando una nuova versione dell'app è disponibile.
 * L'utente può aggiornare con un click invece di ricaricamento forzato.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UPDATE_EVENT, applyServiceWorkerUpdate } from '@/registerServiceWorker';

export default function UpdatePrompt() {
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    const handleUpdate = (event) => {
      if (event?.detail?.registration) {
        setRegistration(event.detail.registration);
      }
    };

    window.addEventListener(UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(UPDATE_EVENT, handleUpdate);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!registration) return;
    await applyServiceWorkerUpdate(registration);
  }, [registration]);

  if (!registration) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-6 left-1/2 z-[99] -translate-x-1/2"
      >
        <div className="glass-strong rounded-2xl px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                Nuova versione disponibile
              </p>
              <p className="mt-0.5 text-xs text-white/50">
                Aggiorna per avere le ultime funzionalità e correzioni.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUpdate}
              className="btn-cyber h-10 shrink-0 rounded-xl px-4 text-xs"
            >
              Aggiorna ora
            </button>
            <button
              type="button"
              onClick={() => setRegistration(null)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30 text-white/45 hover:text-white"
              aria-label="Ignora aggiornamento"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}