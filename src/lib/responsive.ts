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

/** `SideNav` es `position: fixed` a `left: 24`, ancho 208 -- no empuja el
 * contenido, vive en el margen que deja libre la columna centrada (ver su
 * propio docstring). Cualquier ancho de columna más grande que el fijo de
 * 560px tiene que respetar ese hueco a mano, o el sidebar termina flotando
 * ENCIMA de las cards en vez de al costado. */
const SIDENAV_RESERVED = 24 + 208 + 16; // left + ancho + un respiro chico

/**
 * Ancho máximo de columna para una pantalla que quiere aprovechar más
 * espacio en desktop (grillas de 2 columnas, listas más anchas...) sin
 * invadir el margen de `SideNav`. Nunca por debajo de `base` (el ancho fijo
 * que ya usa casi toda la app) ni por encima de `desiredMax` -- entre medio,
 * escala con el viewport real. En nativo o mobile, siempre `base`.
 */
export function useDesktopContentWidth(desiredMax: number, base = 560): number {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  if (!isDesktop) return base;
  const availableForContent = width - SIDENAV_RESERVED * 2;
  return Math.max(base, Math.min(desiredMax, availableForContent));
}
