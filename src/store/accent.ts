/**
 * Preferencia de acento (tema de color): independiente de claro/oscuro/
 * sistema (`store/theme.ts`) — ambos se combinan libremente.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';
import { DEFAULT_ACCENT, type AccentId } from '@/theme/accents';

interface AccentState {
  accent: AccentId;
  setAccent: (accent: AccentId) => void;
}

export const useAccentStore = create<AccentState>()(
  persist(
    (set) => ({
      accent: DEFAULT_ACCENT,
      setAccent: (accent) => set({ accent }),
    }),
    {
      name: 'budget.accent',
      storage: createJSONStorage(() => asyncKVStorage),
      partialize: (s) => ({ accent: s.accent }),
    },
  ),
);
