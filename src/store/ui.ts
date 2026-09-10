/**
 * Preferencias de interfaz que sobreviven al recargar: la última subpestaña
 * elegida en "Vista general" (Resumen / Lista), etc.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';

export type OverviewTab = 'resumen' | 'lista';

interface UIState {
  overviewTab: OverviewTab;
  setOverviewTab: (tab: OverviewTab) => void;
  /** Si ya se mostró la aclaración "buscando en todos tus movimientos" -- se
   * muestra sólo la primera vez que alguien busca, no en cada búsqueda. */
  hasSeenSearchAllHint: boolean;
  dismissSearchAllHint: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      overviewTab: 'resumen',
      setOverviewTab: (overviewTab) => set({ overviewTab }),
      hasSeenSearchAllHint: false,
      dismissSearchAllHint: () => set({ hasSeenSearchAllHint: true }),
    }),
    {
      name: 'budget.ui',
      storage: createJSONStorage(() => asyncKVStorage),
    },
  ),
);
