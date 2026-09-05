/** Llamadas de autenticación contra el backend Django (simplejwt). */
import { api, setTokens, clearTokens } from './client';
import type { GoogleLoginResponse, RegisterResponse, TokenPairResponse, User } from './types';

export interface LoginCredentials {
  /** El backend usa `username` (TokenObtainPairView por defecto), no email. */
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

/** POST /auth/token/ — guarda el par de tokens y devuelve el usuario. */
export async function login(creds: LoginCredentials): Promise<User> {
  const { data } = await api.post<TokenPairResponse>('/auth/token/', creds, {
    skipWorkspace: true,
  });
  await setTokens({ access: data.access, refresh: data.refresh });
  return me();
}

/** POST /auth/register/ — crea la cuenta y deja la sesión iniciada. */
export async function register(input: RegisterInput): Promise<User> {
  const { data } = await api.post<RegisterResponse>('/auth/register/', input, {
    skipWorkspace: true,
  });
  await setTokens({ access: data.access, refresh: data.refresh });
  return data.user;
}

/**
 * POST /auth/google/ — "Continuar con Google": el cliente ya hizo el login
 * nativo/web y trae el `id_token`; el backend lo valida y crea la cuenta la
 * primera vez. Devuelve también `created`, para poder saludar distinto.
 */
export async function loginWithGoogle(idToken: string): Promise<{ user: User; created: boolean }> {
  const { data } = await api.post<GoogleLoginResponse>(
    '/auth/google/',
    { id_token: idToken },
    { skipWorkspace: true },
  );
  await setTokens({ access: data.access, refresh: data.refresh });
  return { user: data.user, created: data.created };
}

/** GET /auth/me/ — usuario autenticado. */
export async function me(): Promise<User> {
  const { data } = await api.get<User>('/auth/me/', { skipWorkspace: true });
  return data;
}

/**
 * Logout. simplejwt no tiene endpoint de logout cableado en las URLs del
 * backend; con ROTATE + BLACKLIST el refresh viejo queda inservible al
 * próximo uso, así que basta con descartar los tokens localmente.
 */
export async function logout(): Promise<void> {
  await clearTokens();
}
