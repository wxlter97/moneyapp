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

type SentrySdk = typeof import('@sentry/react-native');

let sdk: Promise<SentrySdk> | null = null;

/**
 * El SDK pesa ~2,4 MB de fuente (un cuarto del bundle de la web). Con
 * `import()` Metro lo saca a su propio archivo: no se descarga hasta que hay un
 * DSN y no retrasa el primer render. Contrapartida: un error que ocurra antes de
 * que termine de cargar no se reporta, algo aceptable frente al peso.
 */
function loadSdk(): Promise<SentrySdk> {
  sdk ??= import('@sentry/react-native');
  return sdk;
}

export function initSentry(): void {
  if (!DSN) return;

  void loadSdk()
    .then((Sentry) =>
      Sentry.init({
        dsn: DSN,
        environment: __DEV__ ? 'development' : 'production',
        release: Constants.expoConfig?.version,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
      }),
    )
    .catch(() => {
      // Sin el SDK no hay reporte de errores, pero la app no tiene por qué caerse.
    });
}

/** Sólo tiene efecto si `initSentry()` ya corrió con un DSN real -- en
 * cualquier otro caso es un no-op, para no tener que envolver cada
 * `catch` en un chequeo de "¿está Sentry activo?". */
export function captureException(error: unknown): void {
  if (!DSN) return;
  void loadSdk()
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {});
}
