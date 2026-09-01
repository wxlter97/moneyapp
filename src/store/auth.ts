/**
 * Estado de sesión: usuario autenticado + fase de arranque.
 *
 * Los tokens NO viven aquí (los maneja `api/client` + `api/tokenStorage`).
 * Aquí sólo el `User` y si ya sabemos o no si hay sesión.
 */
import { create } from 'zustand';

import * as authApi from '@/api/auth';
import { loadTokens, registerAuthFailureHandler } from '@/api/client';
import type { User } from '@/api/types';
import { useWorkspaceStore } from './workspace';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  status: AuthStatus;

  /** Rehidrata sesión al arrancar la app. Idempotente. */
  bootstrap: () => Promise<void>;
  signIn: (creds: authApi.LoginCredentials) => Promise<void>;
  signUp: (input: authApi.RegisterInput) => Promise<void>;
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

  signOut: async () => {
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
