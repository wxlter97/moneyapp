/**
 * Envoltorio fino sobre `window.umami` (Umami Cloud, sin cookies ni datos
 * personales -- ver `docs/backlog-nuevas-funciones.md` punto 4 y el script
 * inyectado en `+html.tsx`).
 *
 * No hace nada si el script no cargó: instalación sin
 * `EXPO_PUBLIC_UMAMI_WEBSITE_ID`, nativo (`window` no existe), o un
 * bloqueador de contenido -- nunca revienta la acción real por un tracker
 * caído o ausente.
 */
declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

export function track(event: string, data?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined') window.umami?.track(event, data);
  } catch {
    // Un tracker caído o bloqueado no debe romper la acción real.
  }
}
