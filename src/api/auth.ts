/** Llamadas de autenticación contra el backend Django (simplejwt). */
import { api, setTokens, clearTokens } from './client';
import type {
  GoogleLoginResponse,
  RegisterResponse,
  TokenPairResponse,
  TwoFactorBackupCodesResponse,
  TwoFactorEnableResponse,
  TwoFactorRequiredResponse,
  TwoFactorSetupResponse,
  TwoFactorStatus,
  TwoFactorVerifyResponse,
  User,
} from './types';

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

/** Resultado de `login`: o entró directo, o hace falta el código de 2FA
 * (segundo paso, ver `twoFactor.verify`) -- en ese caso todavía NO hay
 * tokens guardados. */
export type LoginResult =
  | { twoFactorRequired: false; user: User }
  | { twoFactorRequired: true; mfaToken: string };

/** POST /auth/token/ — si el usuario no tiene 2FA, guarda el par de tokens y
 * devuelve el usuario; si lo tiene, no guarda nada y devuelve el challenge
 * del segundo paso. */
export async function login(creds: LoginCredentials): Promise<LoginResult> {
  const { data } = await api.post<TokenPairResponse | TwoFactorRequiredResponse>(
    '/auth/token/',
    creds,
    { skipWorkspace: true },
  );
  if ('two_factor_required' in data) {
    return { twoFactorRequired: true, mfaToken: data.mfa_token };
  }
  await setTokens({ access: data.access, refresh: data.refresh });
  return { twoFactorRequired: false, user: await me() };
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

/**
 * POST /auth/google/link/ — vincula la cuenta de Google (mismo correo que la
 * sesión activa) a la cuenta actual, para poder entrar con "Continuar con
 * Google" de ahí en más. A diferencia de `loginWithGoogle`, requiere estar
 * ya autenticado y nunca crea una cuenta nueva.
 */
export async function linkGoogleAccount(idToken: string): Promise<User> {
  const { data } = await api.post<User>(
    '/auth/google/link/',
    { id_token: idToken },
    { skipWorkspace: true },
  );
  return data;
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

// --- 2FA (TOTP) ---------------------------------------------------------
export const twoFactor = {
  status: () =>
    api.get<TwoFactorStatus>('/auth/2fa/', { skipWorkspace: true }).then((r) => r.data),

  /** Genera (o reinicia) el secreto pendiente de confirmar. */
  setup: () =>
    api.post<TwoFactorSetupResponse>('/auth/2fa/setup/', {}, { skipWorkspace: true }).then((r) => r.data),

  /** Confirma con un código real del secreto de `setup`. Los códigos de
   * respaldo vuelven en claro UNA sola vez. */
  enable: (code: string) =>
    api
      .post<TwoFactorEnableResponse>('/auth/2fa/enable/', { code }, { skipWorkspace: true })
      .then((r) => r.data),

  disable: (password: string) =>
    api.post('/auth/2fa/disable/', { password }, { skipWorkspace: true }).then(() => undefined),

  regenerateBackupCodes: (password: string) =>
    api
      .post<TwoFactorBackupCodesResponse>(
        '/auth/2fa/backup-codes/',
        { password },
        { skipWorkspace: true },
      )
      .then((r) => r.data),

  /** Segundo paso del login: `mfaToken` del challenge + código (TOTP o de
   * respaldo) a cambio de los tokens reales. */
  verify: async (mfaToken: string, code: string): Promise<User> => {
    const { data } = await api.post<TwoFactorVerifyResponse>(
      '/auth/2fa/verify/',
      { mfa_token: mfaToken, code },
      { skipWorkspace: true },
    );
    await setTokens({ access: data.access, refresh: data.refresh });
    return data.user;
  },
};
