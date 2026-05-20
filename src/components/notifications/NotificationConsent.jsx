import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import {
  getNotificationConsentState,
  markNotificationConsentSeen,
  requestNotificationConsent,
} from '@/lib/notifications';

export default function NotificationConsent() {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const state = getNotificationConsentState();
    setVisible(state === 'new');
  }, []);

  const closeAsAsked = () => {
    markNotificationConsentSeen('asked');
    setVisible(false);
  };

  const askPermission = async () => {
    if (saving) return;
    setSaving(true);
    await requestNotificationConsent();
    setSaving(false);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[95] mx-auto max-w-md rounded-[1.35rem] border border-emerald-300/25 bg-[#02050c]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 26, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          role="dialog"
          aria-label="Consenso notifiche"
        >
          <button
            type="button"
            onClick={closeAsAsked}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-white/45"
            aria-label="Chiudi richiesta notifiche"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-grotesk text-lg font-black text-white">Notifiche utili, non rumore.</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/55">
                Freeway puo ricordarti sveglie, memo e promemoria. Decidi tu: puoi negare e continuare a usare l app.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={closeAsAsked}
              className="h-11 rounded-xl border border-white/10 bg-white/[0.035] text-sm font-semibold text-white/58"
            >
              Non ora
            </button>
            <button
              type="button"
              onClick={askPermission}
              disabled={saving}
              className="btn-cyber h-11 rounded-xl text-xs disabled:opacity-50"
            >
              {saving ? 'APERTURA...' : 'ATTIVA'}
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
