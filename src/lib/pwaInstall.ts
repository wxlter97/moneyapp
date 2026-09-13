/**
 * Botón "Instalar app" (PWA, sólo web): envuelve el evento
 * `beforeinstallprompt` del navegador. Chrome/Edge/Android lo disparan solos
 * una vez que la página cumple sus criterios de instalabilidad (manifest
 * válido, HTTPS, un service worker activo con `fetch` handler -- `sw.js`
 * (`public/`), registrado sólo en el build web exportado, ver
 * `scripts/pwa-postbuild.js`; a propósito no en dev, para no meter caché
 * offline en medio de Metro). Safari/iOS nunca dispara este evento: ahí no
 * hay prompt nativo, sólo el paso manual "Compartir → Agregar a inicio" (ver
 * `isIosSafari`).
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

/** Safari en iOS/iPadOS (no Chrome/Firefox corriendo sobre WebKit ahí, que
 * también incluyen "WebKit" en el user agent). */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

interface InstallPromptState {
  /** Hay un prompt nativo del navegador listo para mostrar. */
  available: boolean;
  /** Ya corre instalada (`display-mode: standalone`) -- no tiene sentido
   * ofrecer instalarla de nuevo. */
  installed: boolean;
  promptInstall: () => Promise<void>;
}

export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    function onBeforeInstall(e: Event) {
      // Sin esto el navegador muestra su propio mini-banner de inmediato en
      // vez de dejarnos decidir cuándo ofrecerlo (acá: el botón de
      // Herramientas → Apariencia).
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // Acepte o descarte, el mismo evento no se puede reusar -- si sigue sin
    // instalarse, el navegador dispara `beforeinstallprompt` de nuevo más
    // adelante por su cuenta.
    setDeferred(null);
  }

  return { available: deferred != null, installed, promptInstall };
}
