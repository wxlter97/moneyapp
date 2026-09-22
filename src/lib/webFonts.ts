import { Platform } from 'react-native';

/** Más que esto y la app arranca igual: con el respaldo sans de
 * `theme/typography.ts` un .ttf lento se ve como una sans del sistema, no
 * como una pantalla trabada en el splash. */
const MAX_WAIT_MS = 4000;

/**
 * En web, espera a que las fuentes estén descargadas de verdad.
 *
 * `useFonts` de expo-font no lo garantiza en Safari/iOS: ahí se salta
 * `fontfaceobserver` (roto en WebKit, ver `isFontLoadingListenerSupported` en
 * `expo-font/build/ExpoFontLoader.web.js`) y resuelve apenas registra el
 * `@font-face`, sin esperar el archivo. `document.fonts.load` es la API
 * nativa y sí funciona en Safari: además de esperar, dispara la descarga de
 * las familias que todavía nadie usó en pantalla. En nativo no hace nada.
 */
export async function waitForWebFonts(families: string[]): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !document.fonts?.load) return;

  const loads = Promise.all(families.map((family) => document.fonts.load(`16px "${family}"`)));
  const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS));
  await Promise.race([loads, timeout]).catch(() => undefined);
}
