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
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      overviewTab: 'resumen',
      setOverviewTab: (overviewTab) => set({ overviewTab }),
    }),
    {
      name: 'budget.ui',
      storage: createJSONStorage(() => asyncKVStorage),
    },
  ),
);
