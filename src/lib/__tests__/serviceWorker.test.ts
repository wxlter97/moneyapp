import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..', '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

/**
 * Un navegador sólo tiene UN service worker activo por alcance, y el último
 * `register()` reemplaza al anterior. Cuando el push vivía en un worker aparte, cada
 * apertura de la app lo pisaba con `sw.js` (que no manejaba `push`) y los avisos se
 * perdían sin ningún error. Estos tests fijan las dos cosas que lo evitan.
 */
describe('service worker de la PWA', () => {
  it('sw.js muestra el aviso cuando llega un push', () => {
    const sw = read('public/sw.js');
    expect(sw).toMatch(/addEventListener\(\s*'push'/);
    expect(sw).toMatch(/showNotification/);
    expect(sw).toMatch(/addEventListener\(\s*'notificationclick'/);
  });

  it('todo lo que registra un worker registra el mismo script', () => {
    const registered = new Set<string>();
    for (const file of ['src/lib/webPush.ts', 'scripts/pwa-postbuild.js']) {
      for (const match of read(file).matchAll(/serviceWorker\s*\.register\(\s*'([^']+)'/g)) {
        registered.add(match[1]);
      }
    }
    expect([...registered]).toEqual(['/sw.js']);
  });

  it('push-worker.js (obsoleto) carga sw.js en vez de tener su propio código', () => {
    expect(read('public/push-worker.js')).toMatch(/importScripts\(\s*'\/sw\.js'\s*\)/);
  });
});
