import { Platform, useWindowDimensions } from 'react-native';

/** A partir de qué ancho (web) se considera "desktop": suficiente para una
 * barra lateral fija + la columna de contenido (`MAX_CONTENT_WIDTH`) sin que
 * se sientan pegadas. */
const DESKTOP_BREAKPOINT = 900;

/**
 * `true` en web con viewport ancho (desktop/laptop). En nativo (iOS/Android)
 * siempre `false` — ahí la barra flotante de abajo es la correcta incluso en
 * una tablet grande, no hace falta el layout de sidebar.
 */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}
