/* Service worker de Budget (PWA).
 *
 * Estrategia:
 *  - navegaciones (HTML): network-first con fallback al index.html cacheado
 *    (permite abrir la app sin conexión; los datos los maneja la app).
 *  - estáticos con hash (/_expo/, /assets/, fuentes, imágenes): cache-first.
 *  - API y todo lo demás: se deja pasar a la red (no se cachea: es sensible).
 *
 * IMPORTANTE: `CACHE` debe cambiar en cada release (iguala la versión de
 * `package.json`/`app.json`). Si no cambia, el navegador no reinstala este
 * worker (el archivo queda byte-a-byte igual) y sigue sirviendo el
 * `index.html` viejo cacheado -- que apunta a JS/CSS con hash de un build
 * anterior, ya no disponibles tras el siguiente deploy. Eso deja la app en
 * pantalla en blanco al reabrirla (p. ej. justo después de cerrar sesión).
 */
const CACHE = 'budget-v1.6.0';
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
      fetch(request)
        .then((res) => {
          // Nunca cachear una respuesta de error como si fuera el shell
          // válido (p. ej. un 502 del proxy durante el deploy) -- eso
          // dejaría el fallback offline sirviendo un error para siempre.
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
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
