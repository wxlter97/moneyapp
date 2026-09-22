/* Service worker de Budget (PWA).
 *
 * Estrategia:
 *  - navegaciones (HTML): stale-while-revalidate -- responde con el
 *    index.html cacheado al toque (reabrir la PWA no espera una vuelta de
 *    red) y de yapa dispara un fetch en segundo plano que actualiza la
 *    caché para la PRÓXIMA apertura. Antes esto era network-first (esperar
 *    la red siempre, cache sólo si fallaba), que es lo que hacía que
 *    reabrir la PWA tardara en redes lentas/con latencia alta aunque ya
 *    hubiera un shell válido guardado localmente.
 *  - estáticos con hash (/_expo/, /assets/, fuentes, imágenes): cache-first.
 *  - API y todo lo demás: se deja pasar a la red (no se cachea: es sensible).
 *
 * IMPORTANTE: `CACHE` debe cambiar en cada release (iguala la versión de
 * `package.json`/`app.json`). Si no cambia, el navegador no reinstala este
 * worker (el archivo queda byte-a-byte igual) y sigue sirviendo el
 * `index.html` viejo cacheado -- que apunta a JS/CSS con hash de un build
 * anterior, ya no disponibles tras el siguiente deploy. Eso deja la app en
 * pantalla en blanco al reabrirla (p. ej. justo después de cerrar sesión).
 * El revalidate en segundo plano de acá abajo acorta esa ventana: alcanza
 * con reabrir la PWA una vez para que quede lista la versión nueva.
 */
const CACHE = 'budget-v1.7.0';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/') ||
    /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|otf|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API en otro host: red directa

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        // Nunca cachear una respuesta de error como si fuera el shell válido
        // (p. ej. un 502 del proxy durante el deploy) -- eso dejaría el
        // fallback offline sirviendo un error para siempre.
        const revalidate = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put('/index.html', copy));
            }
            return res;
          })
          .catch(() => cached || caches.match('/'));

        // `waitUntil`, no sólo el `.then` de arriba: sin esto el navegador
        // puede matar el worker apenas se manda la respuesta cacheada, antes
        // de que el fetch en segundo plano llegue a actualizar la caché.
        event.waitUntil(revalidate);

        // Con algo cacheado, listo al toque. Sin nada cacheado todavía
        // (primera visita), no queda otra que esperar esa misma promesa.
        return cached || revalidate;
      }),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              if (res.ok) {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(request, copy));
              }
              return res;
            })
            // Un hash que ya no existe (build viejo cacheado) o un corte de
            // red no debe tirar toda la carga: mejor un 404 explícito que
            // una promesa rechazada sin manejar en el fetch handler.
            .catch(() => new Response(null, { status: 404, statusText: 'Not Found' })),
      ),
    );
  }
});

// --- Web Push -------------------------------------------------------------
// Tiene que vivir ACÁ y no en otro worker: un navegador sólo puede tener un
// service worker activo por alcance, y `index.html` registra este archivo en
// cada carga (ver `scripts/pwa-postbuild.js`). Cuando el manejador de push
// estaba en un `push-worker.js` aparte, cada apertura de la app lo reemplazaba
// por este worker, que no lo tenía: el aviso llegaba al teléfono y nadie lo
// mostraba (en iOS, además, eso termina revocando la suscripción).
// La suscripción se hace en `src/lib/webPush.ts`.
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

// Al tocar el aviso: si ya hay una ventana de la app abierta, la enfoca en
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
