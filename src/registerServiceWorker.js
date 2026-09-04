export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return

  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {})
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {
        // L'app resta pienamente utilizzabile anche senza installazione PWA.
      })
  })
}
