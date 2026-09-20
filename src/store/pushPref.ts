/**
 * Si este dispositivo quiere recibir avisos push. Se persiste: sin esto, apagar
 * los avisos no duraba nada, porque la app se vuelve a registrar sola en cada
 * arranque (ver `(app)/_layout.tsx`). Es por dispositivo, no por cuenta.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';

interface PushPrefState {
  enabled: boolean;
  hydrated: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const usePushPrefStore = create<PushPrefState>()(
  persist(
    (set) => ({
      enabled: true,
      hydrated: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'budget.push',
      storage: createJSONStorage(() => asyncKVStorage),
      partialize: (s) => ({ enabled: s.enabled }),
      onRehydrateStorage: () => () => {
        usePushPrefStore.setState({ hydrated: true });
      },
    },
  ),
);
