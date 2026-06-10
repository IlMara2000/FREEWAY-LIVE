/**
 * Freeway Life - Service Worker Registration
 * 
 * Migliorato:
 * - Mostra prompt "Nuova versione disponibile" invece di ricaricare forzatamente
 * - Aggiornamento silenzioso in background
 */

const UPDATE_EVENT = 'fw:sw-update-available';

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
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent(UPDATE_EVENT, {
            detail: { registration },
          }));
        }

        // Listen for new service workers
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nuova versione disponibile - non ricaricare forzatamente
              window.dispatchEvent(new CustomEvent(UPDATE_EVENT, {
                detail: { registration },
              }));
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

  registration.waiting.postMessage({ type: 'SKIP_WAITING' });

  // Wait for the new service worker to activate
  await new Promise((resolve) => {
    const onStateChange = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.removeEventListener('controllerchange', onStateChange);
        resolve();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onStateChange);
  });

  window.location.reload();
};

export { UPDATE_EVENT };