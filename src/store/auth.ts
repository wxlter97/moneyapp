/**
 * Estado de sesión: usuario autenticado + fase de arranque.
 *
 * Los tokens NO viven aquí (los maneja `api/client` + `api/tokenStorage`).
 * Aquí sólo el `User` y si ya sabemos o no si hay sesión.
 */
import { create } from 'zustand';

import * as authApi from '@/api/auth';
import { loadTokens, registerAuthFailureHandler } from '@/api/client';
import { pushDevices } from '@/api/resources';
import type { User } from '@/api/types';
import { getCachedPushDevice, clearCachedPushDevice } from '@/lib/notifications';
import { useWorkspaceStore } from './workspace';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  status: AuthStatus;

  /** Rehidrata sesión al arrancar la app. Idempotente. */
  bootstrap: () => Promise<void>;
  signIn: (creds: authApi.LoginCredentials) => Promise<void>;
  signUp: (input: authApi.RegisterInput) => Promise<void>;
  /** "Continuar con Google". Devuelve `created` para saludar distinto la primera vez. */
  signInWithGoogle: (idToken: string) => Promise<{ created: boolean }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'loading',

  bootstrap: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ status: 'anonymous', user: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ status: 'authenticated', user });
    } catch {
      // token inválido/expirado sin refresh posible -> el interceptor ya limpió
      set({ status: 'anonymous', user: null });
    }
  },

  signIn: async (creds) => {
    const user = await authApi.login(creds);
    set({ status: 'authenticated', user });
  },

  signUp: async (input) => {
    const user = await authApi.register(input);
    set({ status: 'authenticated', user });
  },

  signInWithGoogle: async (idToken) => {
    const { user, created } = await authApi.loginWithGoogle(idToken);
    set({ status: 'authenticated', user });
    return { created };
  },

  signOut: async () => {
    // Antes de limpiar los tokens: el endpoint de baja pide el mismo auth
    // que el resto del API. Best-effort -- si falla, el token simplemente
    // sigue registrado contra un usuario que ya cerró sesión en este
    // dispositivo (inofensivo: sólo implica un push de más algún día).
    const device = getCachedPushDevice();
    if (device) {
      await pushDevices.unregister(device.token).catch(() => {});
      clearCachedPushDevice();
    }
    await authApi.logout();
    useWorkspaceStore.getState().reset();
    set({ status: 'anonymous', user: null });
  },
}));

// Si el refresh falla en cualquier request, caemos a anónimo.
registerAuthFailureHandler(() => {
  useWorkspaceStore.getState().reset();
  useAuthStore.setState({ status: 'anonymous', user: null });
});
