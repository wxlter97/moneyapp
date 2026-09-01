/**
 * Workspace activo + lista de workspaces del usuario.
 *
 * El id activo se persiste (localStorage / SecureStore) para no volver a pedirlo
 * en cada arranque. La lista se rehidrata desde el API al iniciar sesión.
 *
 * Este módulo NO importa el cliente HTTP: el interceptor de `client.ts` lee
 * `getActiveWorkspaceId()` para el header X-Workspace-ID.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';
import type { Workspace } from '@/api/types';

interface WorkspaceState {
  activeId: string | null;
  workspaces: Workspace[];
  /** false hasta que zustand termina de rehidratar el id persistido. */
  hydrated: boolean;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveId: (id: string | null) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeId: null,
      workspaces: [],
      hydrated: false,

      setWorkspaces: (workspaces) => {
        const { activeId } = get();
        const stillValid = activeId != null && workspaces.some((w) => w.id === activeId);
        set({
          workspaces,
          activeId: stillValid ? activeId : (workspaces[0]?.id ?? null),
        });
      },

      setActiveId: (id) => set({ activeId: id }),

      reset: () => set({ activeId: null, workspaces: [] }),
    }),
    {
      name: 'budget.workspace',
      storage: createJSONStorage(() => asyncKVStorage),
      // Solo persistimos el id activo; la lista se recarga del API.
      partialize: (s) => ({ activeId: s.activeId }),
      onRehydrateStorage: () => () => {
        useWorkspaceStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Acceso sincrónico para código fuera de React (interceptores axios). */
export function getActiveWorkspaceId(): string | null {
  return useWorkspaceStore.getState().activeId;
}
