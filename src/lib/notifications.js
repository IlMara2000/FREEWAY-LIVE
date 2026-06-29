import { supabase } from '@/lib/supabaseClient';
import { getClientTimezone } from '@/lib/timezone';

export const NOTIFICATION_STATE_KEY = 'fw_notification_consent_v1';
export const NOTIFICATION_PUBLIC_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || '';

const SUPPORT_UNAVAILABLE = {
  supported: false,
  code: 'unsupported',
  message: 'Questo browser non supporta le notifiche push web.',
};

const isBrowser = () => typeof window !== 'undefined' && typeof navigator !== 'undefined';

const isIosDevice = () => {
  if (!isBrowser()) return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isStandalonePwa = () => {
  if (!isBrowser()) return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

const getStoredConsentState = () => {
  if (!isBrowser()) return null;

  try {
    const stored = window.localStorage.getItem(NOTIFICATION_STATE_KEY);
    if (stored === 'asked' || stored === 'denied' || stored === 'granted') return stored;
  } catch {
    // Local storage is optional; browser permission remains the source of truth.
  }

  return null;
};

const persistConsentState = (state) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(NOTIFICATION_STATE_KEY, state);
  } catch {
    // Ignore storage failures; permission request still works.
  }
};

export const getNotificationConsentState = () => {
  if (!isBrowser()) return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const stored = getStoredConsentState();
  if (stored === 'asked') return 'asked';

  return 'new';
};

export const markNotificationConsentSeen = (state) => {
  if (!['asked', 'denied', 'granted'].includes(state)) return;
  persistConsentState(state);
};

export const requestNotificationConsent = async () => {
  if (!isBrowser() || !('Notification' in window)) return 'unsupported';

  const permission = await Notification.requestPermission();
  markNotificationConsentSeen(permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'asked');
  return permission;
};

export const getPushSupportState = () => {
  if (!isBrowser()) return SUPPORT_UNAVAILABLE;
  if (!('Notification' in window)) return SUPPORT_UNAVAILABLE;
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      code: 'service_worker_unavailable',
      message: 'Il browser non espone il service worker necessario per le push.',
    };
  }
  if (!('PushManager' in window)) {
    return {
      supported: false,
      code: isIosDevice() && !isStandalonePwa() ? 'ios_install_required' : 'push_manager_unavailable',
      message: isIosDevice() && !isStandalonePwa()
        ? 'Su iPhone/iPad devi installare Freeway Life nella Home Screen e aprirla da li prima di attivare le notifiche.'
        : 'Questo browser non supporta le notifiche push web.',
    };
  }
  if (isIosDevice() && !isStandalonePwa()) {
    return {
      supported: false,
      code: 'ios_install_required',
      message: 'Su iPhone/iPad installa Freeway Life nella Home Screen, poi aprila dall icona e torna qui.',
    };
  }
  if (!NOTIFICATION_PUBLIC_KEY) {
    return {
      supported: false,
      code: 'server_config_missing',
      message: 'Le chiavi Web Push non sono ancora configurate sul server.',
    };
  }

  return {
    supported: true,
    code: 'supported',
    message: 'Notifiche push disponibili.',
  };
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

export const ensureServiceWorkerRegistration = async () => {
  if (!isBrowser() || !('serviceWorker' in navigator)) {
    throw Object.assign(new Error('Service worker non disponibile.'), { code: 'service_worker_unavailable' });
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration('/');
  if (existingRegistration) return existingRegistration;

  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
};

const readSubscriptionKeys = (subscription) => {
  const serialized = subscription?.toJSON?.() || {};
  return {
    p256dh: serialized?.keys?.p256dh || '',
    auth: serialized?.keys?.auth || '',
    serialized,
  };
};

const getCurrentSession = async () => {
  if (!supabase) {
    throw Object.assign(new Error('Supabase non configurato.'), { code: 'supabase_unavailable' });
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user?.id) {
    throw Object.assign(new Error('Accedi prima di attivare le notifiche.'), { code: 'not_authenticated' });
  }

  return data.session;
};

const upsertPushSubscription = async (subscription) => {
  const session = await getCurrentSession();
  const { p256dh, auth, serialized } = readSubscriptionKeys(subscription);

  if (!subscription?.endpoint || !p256dh || !auth) {
    throw Object.assign(new Error('Subscription push incompleta.'), { code: 'invalid_subscription' });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      owner_id: session.user.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      subscription: serialized,
      user_agent: navigator.userAgent || '',
      timezone: getClientTimezone(),
      enabled: true,
      last_seen_at: new Date().toISOString(),
      failure_count: 0,
      last_error: null,
      updated_date: new Date().toISOString(),
    }, { onConflict: 'owner_id,endpoint' })
    .select('id')
    .single();

  if (error) {
    throw Object.assign(new Error(error.message || 'Salvataggio subscription non riuscito.'), { code: 'subscription_sync_failed' });
  }

  return { session };
};

const markRemoteSubscriptionFailed = async (endpoint, error) => {
  if (!endpoint || !supabase) return;

  await supabase
    .from('push_subscriptions')
    .update({
      enabled: false,
      last_error: String(error?.message || 'Test notifiche non riuscito.').slice(0, 500),
      updated_date: new Date().toISOString(),
    })
    .eq('endpoint', endpoint);
};

const getRemoteSubscriptionStatus = async (endpoint) => {
  if (!endpoint) {
    return {
      registered: false,
      remoteEnabled: false,
      serverReady: false,
      code: 'subscription_missing',
      message: 'Subscription locale non trovata.',
    };
  }

  if (!supabase) {
    return {
      registered: false,
      remoteEnabled: false,
      serverReady: false,
      code: 'supabase_unavailable',
      message: 'Supabase non configurato.',
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.user?.id) {
    return {
      registered: false,
      remoteEnabled: false,
      serverReady: false,
      code: 'not_authenticated',
      message: 'Accedi prima di attivare le notifiche.',
    };
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('enabled,last_seen_at,last_tested_at,last_error')
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (error) {
    return {
      registered: false,
      remoteEnabled: false,
      serverReady: false,
      code: error.code || 'subscription_status_failed',
      message: error.message || 'Stato subscription non leggibile da Supabase.',
    };
  }

  if (!data) {
    return {
      registered: false,
      remoteEnabled: false,
      serverReady: true,
      code: 'subscription_not_registered',
      message: 'Dispositivo non ancora registrato sul server.',
    };
  }

  return {
    registered: true,
    remoteEnabled: Boolean(data.enabled),
    serverReady: true,
    lastSeenAt: data.last_seen_at || '',
    lastTestedAt: data.last_tested_at || '',
    lastError: data.last_error || '',
    code: data.enabled ? 'registered' : 'subscription_disabled',
    message: data.enabled
      ? 'Dispositivo registrato su Supabase.'
      : data.last_error
        ? `Dispositivo registrato ma non attivo: ${data.last_error}`
        : 'Dispositivo registrato ma disattivato su Supabase.',
  };
};

export const sendTestPushNotification = async (endpoint) => {
  const session = await getCurrentSession();

  const response = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(
      new Error(payload?.error || 'Notifica di test non inviata.'),
      { code: payload?.code || 'test_notification_failed' },
    );
  }

  return payload;
};

export const getPushSubscriptionStatus = async () => {
  const support = getPushSupportState();
  const permission = !isBrowser() || !('Notification' in window) ? 'unsupported' : Notification.permission;

  if (!support.supported) {
    return {
      ...support,
      permission,
      subscribed: false,
      enabled: false,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration('/').catch(() => null);
  const subscription = await registration?.pushManager?.getSubscription?.().catch(() => null);
  const endpoint = subscription?.endpoint || '';
  const remote = endpoint
    ? await getRemoteSubscriptionStatus(endpoint)
    : {
      registered: false,
      remoteEnabled: false,
      serverReady: true,
      code: 'subscription_missing',
      message: 'Dispositivo non ancora registrato.',
    };

  return {
    ...support,
    permission,
    subscribed: Boolean(subscription),
    registered: remote.registered,
    serverReady: remote.serverReady,
    enabled: permission === 'granted' && Boolean(subscription) && remote.registered && remote.remoteEnabled,
    endpoint,
    code: remote.code || support.code,
    message: remote.message || support.message,
    lastSeenAt: remote.lastSeenAt || '',
    lastTestedAt: remote.lastTestedAt || '',
    lastError: remote.lastError || '',
  };
};

export const enablePushNotifications = async ({ sendTest = true } = {}) => {
  const support = getPushSupportState();
  if (!support.supported) {
    throw Object.assign(new Error(support.message), { code: support.code });
  }

  const permission = await requestNotificationConsent();
  if (permission !== 'granted') {
    throw Object.assign(
      new Error(permission === 'denied' ? 'Permesso notifiche negato dal browser.' : 'Permesso notifiche non completato.'),
      { code: permission === 'denied' ? 'permission_denied' : 'permission_default' },
    );
  }

  const registration = await ensureServiceWorkerRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(NOTIFICATION_PUBLIC_KEY),
  });

  await upsertPushSubscription(subscription);

  if (sendTest) {
    try {
      await sendTestPushNotification(subscription.endpoint);
    } catch (error) {
      await markRemoteSubscriptionFailed(subscription.endpoint, error).catch(() => {});
      throw error;
    }
  }

  markNotificationConsentSeen('granted');
  return {
    permission,
    subscription,
    endpoint: subscription.endpoint,
  };
};

export const disablePushNotifications = async () => {
  const registration = await navigator.serviceWorker?.getRegistration?.('/').catch(() => null);
  const subscription = await registration?.pushManager?.getSubscription?.().catch(() => null);
  const endpoint = subscription?.endpoint || '';

  if (endpoint && supabase) {
    await supabase
      .from('push_subscriptions')
      .update({
        enabled: false,
        updated_date: new Date().toISOString(),
      })
      .eq('endpoint', endpoint);
  }

  await subscription?.unsubscribe?.().catch(() => false);
  markNotificationConsentSeen('asked');

  return { endpoint };
};

export const showLocalNotification = async ({ title, body, tag, url = '/alarms' }) => {
  if (!isBrowser() || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker?.getRegistration?.('/').catch(() => null);
    if (registration?.showNotification) {
      await registration.showNotification(title || 'Freeway Life', {
        body,
        tag,
        icon: '/web-app-manifest-192x192.png',
        badge: '/favicon.svg',
        data: { url },
      });
      return true;
    }

    new Notification(title || 'Freeway Life', {
      body,
      tag,
      icon: '/web-app-manifest-192x192.png',
      badge: '/favicon.svg',
      data: { url },
    });
    return true;
  } catch {
    return false;
  }
};
