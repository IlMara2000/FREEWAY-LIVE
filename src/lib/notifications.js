export const NOTIFICATION_STATE_KEY = 'fw_notification_consent_v1';

export const getNotificationConsentState = () => {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';

  try {
    const stored = window.localStorage.getItem(NOTIFICATION_STATE_KEY);
    if (stored === 'asked' || stored === 'denied' || stored === 'granted') return stored;
  } catch {
    // Local storage is optional; browser permission remains the source of truth.
  }

  return Notification.permission === 'default' ? 'new' : Notification.permission;
};

export const markNotificationConsentSeen = (state) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIFICATION_STATE_KEY, state);
  } catch {
    // Ignore storage failures; permission request still works.
  }
};

export const requestNotificationConsent = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';

  const permission = await Notification.requestPermission();
  markNotificationConsentSeen(permission === 'granted' ? 'granted' : 'denied');
  return permission;
};

export const showLocalNotification = ({ title, body, tag }) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    new Notification(title || 'Freeway Life', {
      body,
      tag,
      icon: '/web-app-manifest-192x192.png',
      badge: '/favicon.svg',
    });
    return true;
  } catch {
    return false;
  }
};
