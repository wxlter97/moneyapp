/**
 * Configuración runtime. Se lee de variables EXPO_PUBLIC_* (embebidas en el
 * bundle en build/dev). No poner secretos aquí: todo lo público llega al cliente.
 */

const DEFAULT_API_URL = 'http://localhost:8000/api/v1';

export const config = {
  /** Base del API REST, incluye el prefijo /api/v1 y sin barra final. */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, ''),
};

export type AppConfig = typeof config;
