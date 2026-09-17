/**
 * Estado de sesión: usuario autenticado + fase de arranque.
 *
 * Los tokens NO viven aquí (los maneja `api/client` + `api/tokenStorage`).
 * Aquí sólo el `User` y si ya sabemos o no si hay sesión.
 */
import axios from 'axios';
import { create } from 'zustand';

import * as authApi from '@/api/auth';
import { loadTokens, registerAuthFailureHandler } from '@/api/client';
import { pushDevices } from '@/api/resources';
import type { User } from '@/api/types';
import { getCachedPushDevice, clearCachedPushDevice } from '@/lib/notifications';
import { unsubscribeWebPush } from '@/lib/webPush';
import { useWorkspaceStore } from './workspace';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  /** Si no es null, `signIn` ya validó usuario/contraseña pero falta el
   * código de 2FA (`verifyTwoFactor`) para terminar de entrar -- todavía
   * NO hay tokens guardados. La pantalla de login lo usa para mostrar el
   * segundo paso en vez del formulario. */
  pendingMfaToken: string | null;

  /** Rehidrata sesión al arrancar la app. Idempotente. */
  bootstrap: () => Promise<void>;
  signIn: (creds: authApi.LoginCredentials) => Promise<void>;
  /** Segundo paso cuando `signIn` dejó `pendingMfaToken` fijado. */
  verifyTwoFactor: (code: string) => Promise<void>;
  /** Vuelve al formulario de usuario/contraseña sin haber completado el 2FA. */
  cancelTwoFactor: () => void;
  signUp: (input: authApi.RegisterInput) => Promise<void>;
  /** "Continuar con Google". Devuelve `created` para saludar distinto la primera vez. */
  signInWithGoogle: (idToken: string) => Promise<{ created: boolean }>;
  /** Vincula Google a la cuenta ya autenticada (Herramientas → Cuenta). */
  linkGoogleAccount: (idToken: string) => Promise<void>;
  /** Termina o saltea el tour de bienvenida (`(app)/onboarding.tsx`) -- lo
   * marca en el backend para que no dependa del dispositivo. */
  markOnboardingCompleted: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'loading',
  pendingMfaToken: null,

  bootstrap: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ status: 'anonymous', user: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ status: 'authenticated', user });
    } catch (err) {
      // Sin `err.response` = la request nunca llegó a resolverse contra el
      // server (sin red todavía, DNS/Wi-Fi reconectando justo al reabrir la
      // PWA desde cero, timeout) -- NO significa que el token sea inválido.
      // Tratarlo igual que un 401 real desloguea con la sesión todavía viva
      // (hallazgo real: "pide login de nuevo al volver a abrir la app" pese
      // a que el refresh dura 60 días -- el bug estaba acá, no en la
      // duración del token). Un 401/403 de verdad ya pasó antes por el
      // interceptor de `api/client.ts`, que intentó refrescar y sólo deja
      // pasar el error si el refresh también falló -- ahí sí es sesión
      // muerta. Un solo reintento corto alcanza para el caso común de "la
      // red todavía no está lista".
      if (axios.isAxiosError(err) && !err.response) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const user = await authApi.me();
          set({ status: 'authenticated', user });
          return;
        } catch {
          // sigue sin poder confirmar sesión -- ver nota abajo.
        }
      }
      set({ status: 'anonymous', user: null });
    }
  },

  signIn: async (creds) => {
    const result = await authApi.login(creds);
    if (result.twoFactorRequired) {
      set({ pendingMfaToken: result.mfaToken });
      return;
    }
    set({ status: 'authenticated', user: result.user, pendingMfaToken: null });
  },

  verifyTwoFactor: async (code) => {
    const mfaToken = useAuthStore.getState().pendingMfaToken;
    if (!mfaToken) throw new Error('No hay un login de 2FA pendiente.');
    const user = await authApi.twoFactor.verify(mfaToken, code);
    set({ status: 'authenticated', user, pendingMfaToken: null });
  },

  cancelTwoFactor: () => set({ pendingMfaToken: null }),

  signUp: async (input) => {
    const user = await authApi.register(input);
    set({ status: 'authenticated', user });
  },

  signInWithGoogle: async (idToken) => {
    const { user, created } = await authApi.loginWithGoogle(idToken);
    set({ status: 'authenticated', user });
    return { created };
  },

  linkGoogleAccount: async (idToken) => {
    const user = await authApi.linkGoogleAccount(idToken);
    set({ user });
  },

  markOnboardingCompleted: async () => {
    const user = await authApi.updateMe({ onboarding_completed: true });
    set({ user });
  },

  signOut: async () => {
    // Antes de limpiar los tokens: el endpoint de baja pide el mismo auth
    // que el resto del API. Best-effort -- si falla, el token simplemente
    // sigue registrado contra un usuario que ya cerró sesión en este
    // dispositivo (inofensivo: sólo implica un push de más algún día).
    const device = getCachedPushDevice();
    if (device) {
      await pushDevices.unregister(device.token).catch(() => {});
      if (device.platform === 'web') await unsubscribeWebPush().catch(() => {});
      clearCachedPushDevice();
    }
    await authApi.logout();
    useWorkspaceStore.getState().reset();
    set({ status: 'anonymous', user: null, pendingMfaToken: null });
  },
}));

// Si el refresh falla en cualquier request, caemos a anónimo.
registerAuthFailureHandler(() => {
  useWorkspaceStore.getState().reset();
  useAuthStore.setState({ status: 'anonymous', user: null, pendingMfaToken: null });
});
