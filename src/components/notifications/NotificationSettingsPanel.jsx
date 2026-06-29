import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Loader2, Smartphone, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAccountPreference from '@/hooks/useAccountPreference';
import { writeLegacyNotificationState } from '@/lib/app-preferences';
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationConsentState,
  getPushSubscriptionStatus,
  sendTestPushNotification,
} from '@/lib/notifications';

const DEFAULT_STATUS = {
  supported: false,
  enabled: false,
  subscribed: false,
  permission: 'default',
  code: 'checking',
  message: 'Controllo notifiche...',
  endpoint: '',
};

const getErrorMessage = (error) => {
  switch (error?.code) {
    case 'ios_install_required':
      return 'Su iPhone/iPad devi installare Freeway Life nella Home Screen e aprirla dall icona prima di attivare le notifiche.';
    case 'server_config_missing':
    case 'web_push_env_missing':
    case 'supabase_server_env_missing':
      return 'Configurazione server notifiche mancante. Servono chiavi Web Push e service role su Vercel.';
    case 'permission_denied':
      return 'Permesso notifiche negato. Riabilitalo dalle impostazioni del browser o del sistema operativo.';
    case 'subscription_sync_failed':
      return 'Dispositivo non salvato su Supabase. Controlla la tabella push_subscriptions e riprova.';
    default:
      return error?.message || 'Operazione notifiche non riuscita.';
  }
};

export default function NotificationSettingsPanel({ profile, saveProfile }) {
  const [, setConsentState] = useAccountPreference({
    profile,
    saveProfile,
    preferenceKey: 'notificationConsentState',
    defaultValue: 'new',
    readLocal: getNotificationConsentState,
    writeLocal: writeLegacyNotificationState,
  });
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const refreshStatus = useCallback(async () => {
    const nextStatus = await getPushSubscriptionStatus().catch((error) => ({
      ...DEFAULT_STATUS,
      code: error?.code || 'status_failed',
      message: error?.message || 'Stato notifiche non leggibile.',
    }));
    setStatus(nextStatus);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const runActivation = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setErrorMessage('');

    try {
      await enablePushNotifications({ sendTest: true });
      setConsentState('granted');
      setMessage('Notifiche attive. Se vedi la notifica di test, il telefono e registrato.');
      await refreshStatus();
    } catch (error) {
      const nextState = error?.code === 'permission_denied' ? 'denied' : 'asked';
      setConsentState(nextState);
      setErrorMessage(getErrorMessage(error));
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setErrorMessage('');

    try {
      await sendTestPushNotification(status.endpoint);
      setMessage('Notifica di test inviata.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const runDisable = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setErrorMessage('');

    try {
      await disablePushNotifications();
      setConsentState('asked');
      setMessage('Notifiche disattivate su questo dispositivo.');
      await refreshStatus();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const isActive = status.enabled;

  return (
    <section className="glass-panel space-y-4 p-5">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isActive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-white/50'}`}>
          {isActive ? <Bell className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <h2 className="font-grotesk text-lg font-bold text-white">Notifiche</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/45">
            Attiva questo dispositivo per ricevere sveglie e promemoria anche a schermo bloccato.
          </p>
        </div>
      </div>

      <div className={`rounded-xl border p-3 text-xs leading-relaxed ${isActive ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-white/55'}`}>
        <div className="flex items-center gap-2 font-semibold">
          {isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isActive ? 'Attive su questo dispositivo' : 'Non attive su questo dispositivo'}
        </div>
        <p className="mt-1">
          Permesso browser: {status.permission}. {status.message}
        </p>
      </div>

      {message && (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100">
          {errorMessage}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          onClick={runActivation}
          disabled={busy}
          className="h-11 rounded-xl btn-cyber"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {isActive ? 'Riattiva / aggiorna' : 'Attiva notifiche'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={runTest}
          disabled={busy || !isActive}
          className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
        >
          Invia test
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={runDisable}
          disabled={busy || !isActive}
          className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 sm:col-span-2"
        >
          <BellOff className="h-4 w-4" />
          Disattiva su questo dispositivo
        </Button>
      </div>
    </section>
  );
}
