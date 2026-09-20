// Obsoleto: el manejador de push vive en `sw.js` (un solo service worker por
// alcance, ver el comentario de "Web Push" allá). Este archivo queda sólo para
// los navegadores que todavía tengan registrado este script: al actualizarse
// cargan el mismo código que `sw.js`, y su suscripción sigue viva. No borrarlo
// (un 404 al actualizar desregistraría el worker y se perdería la suscripción).
importScripts('/sw.js');
