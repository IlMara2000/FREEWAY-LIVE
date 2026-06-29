const CACHE_NAME = 'freeway-life-v12';
const STATIC_ASSETS = [
  '/site.webmanifest',
  '/favicon.svg',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
];
const STATIC_ASSET_PATHS = new Set(STATIC_ASSETS);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!STATIC_ASSET_PATHS.has(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});

const DEFAULT_NOTIFICATION = {
  title: 'Freeway Life',
  body: 'Hai un nuovo promemoria.',
  url: '/',
};

const parsePushPayload = (event) => {
  if (!event.data) return DEFAULT_NOTIFICATION;

  try {
    return {
      ...DEFAULT_NOTIFICATION,
      ...event.data.json(),
    };
  } catch {
    return {
      ...DEFAULT_NOTIFICATION,
      body: event.data.text() || DEFAULT_NOTIFICATION.body,
    };
  }
};

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const title = payload.title || DEFAULT_NOTIFICATION.title;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || DEFAULT_NOTIFICATION.body,
      icon: payload.icon || '/web-app-manifest-192x192.png',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag || 'freeway-life-notification',
      renotify: Boolean(payload.tag),
      data: {
        url: payload.url || DEFAULT_NOTIFICATION.url,
        alarmId: payload.alarmId || null,
        minuteKey: payload.minuteKey || null,
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification?.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const matchingClient = clientList.find((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        if (matchingClient) {
          if ('navigate' in matchingClient) {
            return matchingClient.navigate(targetUrl).then((client) => client?.focus?.());
          }
          return matchingClient.focus?.();
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});
