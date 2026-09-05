/**
 * Cliente HTTP central.
 *
 * Responsabilidades:
 *  - baseURL = EXPO_PUBLIC_API_URL (`.../api/v1`).
 *  - Adjunta `Authorization: Bearer <access>` en cada request.
 *  - Adjunta `X-Workspace-ID` con el workspace activo (salvo endpoints que no
 *    lo requieren: auth y /workspaces).
 *  - Refresh automático del access token ante un 401, con single-flight
 *    (varias requests que fallan a la vez comparten un único refresh).
 *  - Si el refresh falla => limpia tokens y avisa (para mandar a /login).
 *
 * NO importa los stores de React salvo `getActiveWorkspaceId` (lectura
 * sincrónica, sin ciclo: el store de workspace no importa este módulo).
 */
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { config } from '@/config';
import { getActiveWorkspaceId } from '@/store/workspace';
import { tokenStorage, type TokenPair } from './tokenStorage';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Fuerza omitir el header X-Workspace-ID en esta request. */
    skipWorkspace?: boolean;
  }
}

// --- estado de tokens en memoria (fuente de verdad en runtime) ---------------
let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Rehidrata los tokens desde el almacenamiento persistente. Llamar al arrancar. */
export async function loadTokens(): Promise<TokenPair | null> {
  const pair = await tokenStorage.get();
  accessToken = pair?.access ?? null;
  refreshToken = pair?.refresh ?? null;
  return pair;
}

/** Fija el par de tokens (tras login/registro) y lo persiste. */
export async function setTokens(pair: TokenPair): Promise<void> {
  accessToken = pair.access;
  refreshToken = pair.refresh;
  await tokenStorage.save(pair);
}

/** Borra los tokens de memoria y del almacenamiento. */
export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await tokenStorage.clear();
}

export function getAccessToken(): string | null {
  return accessToken;
}

// --- callback de "sesión perdida" ------------------------------------------
type AuthFailureHandler = () => void;
let onAuthFailure: AuthFailureHandler | null = null;

/** El store de auth registra aquí qué hacer cuando el refresh falla (logout). */
export function registerAuthFailureHandler(handler: AuthFailureHandler | null): void {
  onAuthFailure = handler;
}

// --- endpoints que NO llevan X-Workspace-ID -------------------------------
const WORKSPACE_EXEMPT = [
  /^\/auth\//,
  /^\/workspaces(\/|$|\?)/,
  /^\/invitations(\/|$|\?)/,
  /^\/bank-email-schemas(\/|$|\?)/,
];

function needsWorkspaceHeader(url: string | undefined): boolean {
  if (!url) return true;
  return !WORKSPACE_EXEMPT.some((re) => re.test(url));
}

// --- instancia axios ------------------------------------------------------
export const api: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(cfg.headers);

  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  else headers.delete('Authorization');

  if (!cfg.skipWorkspace && needsWorkspaceHeader(cfg.url)) {
    const wsId = getActiveWorkspaceId();
    if (wsId) headers.set('X-Workspace-ID', wsId);
  }

  cfg.headers = headers;
  return cfg;
});

// --- refresh con single-flight ------------------------------------------
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshToken) throw new Error('no refresh token');

  // Se hace por `api` (no axios crudo) para compartir baseURL/adapter, pero
  // el interceptor de respuesta detecta la URL `/auth/token/refresh/` y no
  // reintenta ni recursa sobre ella.
  const { data } = await api.post<{ access: string; refresh?: string }>(
    '/auth/token/refresh/',
    { refresh: refreshToken },
    { skipWorkspace: true },
  );

  accessToken = data.access;
  // ROTATE_REFRESH_TOKENS=True en el backend: puede venir un refresh nuevo.
  if (data.refresh) refreshToken = data.refresh;
  await tokenStorage.save({ access: accessToken, refresh: refreshToken! });
  return accessToken;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isRefreshCall = original?.url?.includes('/auth/token/refresh/');

    if (status === 401 && original && !original._retry && !isRefreshCall && refreshToken) {
      original._retry = true;
      try {
        refreshInFlight ??= refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
        const fresh = await refreshInFlight;
        const headers = AxiosHeaders.from(original.headers);
        headers.set('Authorization', `Bearer ${fresh}`);
        original.headers = headers;
        return api.request(original);
      } catch {
        await clearTokens();
        onAuthFailure?.();
        return Promise.reject(error);
      }
    }

    if (status === 401 && !isRefreshCall) {
      // 401 sin posibilidad de refresh: sesión muerta.
      await clearTokens();
      onAuthFailure?.();
    }

    return Promise.reject(error);
  },
);
