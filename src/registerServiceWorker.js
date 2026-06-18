/**
 * Freeway Life - Service Worker Registration
 * 
 * Migliorato:
 * - Mostra prompt "Nuova versione disponibile" invece di ricaricare forzatamente
 * - Aggiornamento silenzioso in background
 */

const UPDATE_EVENT = 'fw:sw-update-available';
const UPDATE_APPLY_TIMEOUT_MS = 5000;

const notifyUpdate = (registration) => {
  if (!registration?.waiting) return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, {
    detail: { registration },
  }));
};

export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    // In development, unregister any previous service workers
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {});
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        registration.update().catch(() => {});

        // Check for updates on page visibility change
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });

        // If there's a waiting worker, notify the user
        notifyUpdate(registration);

        // Listen for new service workers
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate(registration);
            }
          });
        });
      })
      .catch((error) => {
        console.warn('Service worker registration failed:', error);
      });

    // Listen for controller changes without forced reload
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      // Soft refresh: non ricarica la pagina, aspetta la prossima navigazione
      reloading = false;
    });
  });
};

/**
 * Attiva l'aggiornamento e ricarica la pagina
 * Da chiamare quando l'utente clicca "Aggiorna ora"
 */
export const applyServiceWorkerUpdate = async (registration) => {
  if (!registration || !registration.waiting) return;

  const waitingWorker = registration.waiting;

  const activation = new Promise((resolve) => {
    let resolved = false;
    const finish = (status) => {
      if (resolved) return;
      resolved = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      waitingWorker.removeEventListener('statechange', onWorkerStateChange);
      resolve(status);
    };

    const onControllerChange = () => finish('controllerchange');
    const onWorkerStateChange = () => {
      if (waitingWorker.state === 'activated') finish('activated');
      if (waitingWorker.state === 'redundant') finish('redundant');
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    waitingWorker.addEventListener('statechange', onWorkerStateChange);
  });

  waitingWorker.postMessage({ type: 'SKIP_WAITING' });

  const outcome = await Promise.race([
    activation,
    new Promise((resolve) => window.setTimeout(() => resolve('timeout'), UPDATE_APPLY_TIMEOUT_MS)),
  ]);

  if (outcome === 'timeout' || outcome === 'redundant') {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((entry) => entry.unregister().catch(() => false)));
  }

  window.location.reload();
};

export { UPDATE_EVENT };
