export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return

  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {})
    return
  }

  window.addEventListener('load', () => {
    let hasReloaded = false
    const hadController = Boolean(navigator.serviceWorker.controller)

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // On the first install there is nothing stale to replace: reloading would
      // interrupt someone who has already started typing. Reload only updates.
      if (!hadController || hasReloaded) return
      hasReloaded = true
      window.location.reload()
    })

    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {
        // L'app resta pienamente utilizzabile anche senza installazione PWA.
      })
  })
}
