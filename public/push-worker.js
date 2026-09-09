// Service worker de Web Push -- SÓLO push, sin caché offline (otro alcance).
// Se registra desde src/lib/webPush.ts (sólo Platform.OS === 'web'), que es
// lo único que lo usa: no forma parte del bundle de Expo Router, vive en
// public/ y el export web de Expo lo copia tal cual a la raíz del sitio.

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Budget', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Budget';
  const options = {
    body: payload.body || '',
    data: payload.data || {},
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Al tocar el aviso: si ya hay una pestaña de la app abierta, la enfoca en
// vez de abrir una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
      return undefined;
    }),
  );
});
