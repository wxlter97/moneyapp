/**
 * Configuración runtime. Se lee de variables EXPO_PUBLIC_* (embebidas en el
 * bundle en build/dev). No poner secretos aquí: todo lo público llega al cliente.
 */

const DEFAULT_API_URL = 'http://localhost:8000/api/v1';

export const config = {
  /** Base del API REST, incluye el prefijo /api/v1 y sin barra final. */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, ''),

  /**
   * Client IDs de Google OAuth (Google Cloud Console), uno por plataforma --
   * todos apuntan a la misma cuenta/proyecto. Sin ninguno configurado,
   * "Continuar con Google" simplemente no se muestra (ver useGoogleSignIn).
   */
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  },

  /**
   * Link de iCloud del Atajo de Apple Shortcuts ya armado ("Compartir →
   * Copiar enlace de iCloud" desde la app Shortcuts). Vacío = Herramientas →
   * Atajos sólo muestra cómo armarlo a mano.
   *
   * Por qué un link y no un archivo que generemos por usuario con su token
   * adentro: desde iOS 15 un `.shortcut` sólo se puede importar si viene
   * firmado (formato AEA, propietario), y firmarlo necesita macOS -- no se
   * puede hacer en el backend. El link de iCloud ya viene firmado por Apple,
   * y el token lo pide el propio Atajo al importarse (Import Question).
   */
  shortcutUrl: process.env.EXPO_PUBLIC_SHORTCUT_URL?.trim() || undefined,
};

export type AppConfig = typeof config;
