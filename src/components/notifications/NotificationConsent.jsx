import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle2, X } from 'lucide-react';
import useUserProfile from '@/hooks/useUserProfile';
import useAccountPreference from '@/hooks/useAccountPreference';
import { writeLegacyNotificationState } from '@/lib/app-preferences';
import {
  enablePushNotifications,
  getNotificationConsentState,
  getPushSupportState,
} from '@/lib/notifications';

const getActivationErrorMessage = (error) => {
  switch (error?.code) {
    case 'ios_install_required':
      return 'Su iPhone/iPad: condividi il sito, aggiungilo alla Home Screen, poi apri Freeway Life dall icona e riprova.';
    case 'server_config_missing':
    case 'web_push_env_missing':
    case 'supabase_anon_env_missing':
      return 'Notifiche non ancora configurate sul server. Riprova dopo l aggiornamento.';
    case 'supabase_server_env_missing':
      return 'Supabase non è configurato nelle funzioni server. Riprova dopo l aggiornamento.';
    case 'permission_denied':
      return 'Permesso negato. Devi riabilitarlo dalle impostazioni notifiche del browser/sistema.';
    case 'permission_default':
      return 'Procedura interrotta. Puoi riprovare da Account > Notifiche.';
    default:
      return error?.message || 'Attivazione notifiche non riuscita.';
  }
};

export default function NotificationConsent() {
  const { profile, saveProfile } = useUserProfile();
  const [consentState, setConsentState] = useAccountPreference({
    profile,
    saveProfile,
    preferenceKey: 'notificationConsentState',
    defaultValue: 'new',
    readLocal: getNotificationConsentState,
    writeLocal: writeLegacyNotificationState,
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [keepVisibleAfterAttempt, setKeepVisibleAfterAttempt] = useState(false);
  const support = getPushSupportState();
  const canAutoPrompt = support.supported || support.code === 'ios_install_required';
  const visible = (consentState === 'new' && canAutoPrompt) || keepVisibleAfterAttempt;

  const closeAsAsked = () => {
    setConsentState('asked');
    setKeepVisibleAfterAttempt(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const askPermission = async () => {
    if (saving) return;
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await enablePushNotifications({ sendTest: true });
      setKeepVisibleAfterAttempt(false);
      setConsentState('granted');
      setSuccessMessage('Notifiche attive. Ti ho inviato una notifica di test.');
    } catch (error) {
      const nextState = error?.code === 'permission_denied' ? 'denied' : 'asked';
      setKeepVisibleAfterAttempt(true);
      setConsentState(nextState);
      writeLegacyNotificationState(nextState);
      setErrorMessage(getActivationErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          className="fixed inset-x-3 bottom-[calc(6.35rem+env(safe-area-inset-bottom))] z-[95] mx-auto max-h-[calc(100dvh-7.5rem)] max-w-md overflow-y-auto rounded-[1.35rem] border border-emerald-300/25 bg-[#02050c]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:bottom-[calc(1rem+env(safe-area-inset-bottom))] md:max-h-[calc(100dvh-2rem)]"
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
              <h2 className="font-grotesk text-lg font-black text-white">Attiva le notifiche sul telefono</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/55">
                Servono per sveglie e promemoria anche quando Freeway Life non e aperta. Se chiudi ora, non te lo richiedo:
                potrai riattivarle da Account &gt; Notifiche.
              </p>
              {!support.supported && (
                <p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-400/10 p-2 text-xs leading-relaxed text-amber-100/80">
                  {support.message}
                </p>
              )}
            </div>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              {successMessage}
            </p>
          )}

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
              {saving ? 'ATTIVO...' : 'ATTIVA'}
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
