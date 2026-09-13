/**
 * Error tracking (Sentry) -- opcional. Sin `EXPO_PUBLIC_SENTRY_DSN` esta
 * función no hace nada (ni siquiera toca el SDK), así que no hace falta
 * tener la cuenta creada para que el resto de la app funcione. Cuando
 * exista un proyecto de Sentry, sólo hay que setear la env var (ver
 * `.env.example`) -- nada de código que tocar de nuevo.
 *
 * Nota para más adelante: esto NO sube source maps ni symbolica stack
 * traces nativos (necesitaría el plugin de Expo + `SENTRY_AUTH_TOKEN` en
 * el build de EAS) -- deliberadamente no se agregó ese plugin todavía para
 * no arriesgar el pipeline de build sin credenciales configuradas. Los
 * errores igual llegan a Sentry, sólo que el stack trace nativo (no el de
 * JS, que sí sale legible) puede venir ofuscado hasta que se complete eso.
 */
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry(): void {
  if (!DSN) return;

  // Import diferido: si no hay DSN, el bundle ni siquiera necesita evaluar
  // el módulo del SDK en el hot path de arranque.
  const Sentry = require('@sentry/react-native');
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

/** Sólo tiene efecto si `initSentry()` ya corrió con un DSN real -- en
 * cualquier otro caso es un no-op, para no tener que envolver cada
 * `catch` en un chequeo de "¿está Sentry activo?". */
export function captureException(error: unknown): void {
  if (!DSN) return;
  const Sentry = require('@sentry/react-native');
  Sentry.captureException(error);
}
