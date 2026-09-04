/**
 * Preferencia de tema: claro / oscuro / sistema. Se persiste y se aplica con
 * `colorScheme.set()` de NativeWind en el layout raíz.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';

export type ThemePref = 'light' | 'dark' | 'system';

interface ThemeState {
  pref: ThemePref;
  hydrated: boolean;
  setPref: (pref: ThemePref) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      pref: 'dark', // dark-first
      hydrated: false,
      setPref: (pref) => set({ pref }),
    }),
    {
      name: 'budget.theme',
      storage: createJSONStorage(() => asyncKVStorage),
      partialize: (s) => ({ pref: s.pref }),
      onRehydrateStorage: () => () => {
        useThemeStore.setState({ hydrated: true });
      },
    },
  ),
);
