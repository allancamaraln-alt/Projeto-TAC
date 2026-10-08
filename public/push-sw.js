// Carregado dentro do service worker gerado pelo vite-plugin-pwa
// (workbox.importScripts em vite.config.js). Recebe os pushes enviados pela
// edge function `send-service-notifications` e abre a OS ao tocar no aviso.

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() } }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ClimaPro', {
      body: data.body || '',
      icon: '/icons/icon-192.webp',
      badge: '/icons/icon-96.webp',
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of janelas) {
      if (c.url.startsWith(self.location.origin) && 'focus' in c) {
        await c.focus()
        if ('navigate' in c) await c.navigate(url)
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
