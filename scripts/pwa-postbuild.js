/**
 * Inyecta los tags PWA en dist/index.html después de `expo export -p web`.
 *
 * Con `web.output: "single"` Expo genera un index.html propio e ignora
 * `app/+html.tsx`, así que el manifest, los meta de instalación y el registro
 * del service worker se añaden aquí. Idempotente.
 */
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', 'dist', 'index.html');
const MARKER = '<!-- pwa:injected -->';

const HEAD_TAGS = `
    ${MARKER}
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#111111" />
    <meta name="color-scheme" content="dark light" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Budget" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
`;

const SW_SCRIPT = `    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
`;

// Umami Cloud, sin cookies (ver `docs/backlog-nuevas-funciones.md` punto 4 y
// `src/lib/analytics.ts`). Vacío = no se inyecta nada -- la política de
// privacidad sigue siendo cierta tal cual está ("no usamos cookies ni
// rastreadores"). Va acá, no en `app/+html.tsx` (ver el comentario de arriba:
// con `web.output: "single"` ese archivo no tiene efecto), y se lee en build
// time porque este script corre después de `expo export`, no en el bundle.
const UMAMI_WEBSITE_ID = process.env.EXPO_PUBLIC_UMAMI_WEBSITE_ID;
const UMAMI_SCRIPT = UMAMI_WEBSITE_ID
  ? `    <script defer src="https://cloud.umami.is/script.js" data-website-id="${UMAMI_WEBSITE_ID}"></script>\n`
  : '';

function main() {
  if (!fs.existsSync(INDEX)) {
    console.error('[pwa-postbuild] no existe', INDEX, '— ¿corriste expo export -p web?');
    process.exit(1);
  }
  let html = fs.readFileSync(INDEX, 'utf8');
  if (html.includes(MARKER)) {
    console.log('[pwa-postbuild] ya inyectado, nada que hacer.');
    return;
  }
  html = html.replace('<html lang="en">', '<html lang="es">');
  html = html.replace('</head>', HEAD_TAGS + UMAMI_SCRIPT + '  </head>');
  html = html.replace('</body>', SW_SCRIPT + '  </body>');
  fs.writeFileSync(INDEX, html);
  console.log(
    '[pwa-postbuild] tags PWA inyectados en dist/index.html'
      + (UMAMI_WEBSITE_ID ? ' (con Umami)' : ' (sin Umami: EXPO_PUBLIC_UMAMI_WEBSITE_ID vacío)'),
  );
}

main();
