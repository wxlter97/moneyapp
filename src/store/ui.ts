/**
 * Preferencias de interfaz que sobreviven al recargar: la última subpestaña
 * elegida en "Inicio" (Resumen / Lista / Calendario), etc.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';

export type OverviewTab = 'resumen' | 'lista' | 'calendario';

interface UIState {
  overviewTab: OverviewTab;
  setOverviewTab: (tab: OverviewTab) => void;
  /** Si ya se mostró la aclaración "buscando en todos tus movimientos" -- se
   * muestra sólo la primera vez que alguien busca, no en cada búsqueda. */
  hasSeenSearchAllHint: boolean;
  dismissSearchAllHint: () => void;
  /** Oculta las cifras grandes de los headers de Inicio y Presupuesto (el "ojito"). */
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      overviewTab: 'resumen',
      setOverviewTab: (overviewTab) => set({ overviewTab }),
      hasSeenSearchAllHint: false,
      dismissSearchAllHint: () => set({ hasSeenSearchAllHint: true }),
      hideAmounts: false,
      toggleHideAmounts: () => set((s) => ({ hideAmounts: !s.hideAmounts })),
    }),
    {
      name: 'budget.ui',
      storage: createJSONStorage(() => asyncKVStorage),
    },
  ),
);
