/**
 * Preferencia de acento (tema de color): independiente de claro/oscuro/
 * sistema (`store/theme.ts`) — ambos se combinan libremente.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';
import { DEFAULT_ACCENT, DEFAULT_CUSTOM_HEX, type AccentId } from '@/theme/accents';

interface AccentState {
  accent: AccentId;
  /** Hex del acento `'custom'` (ver `theme/accents.ts::resolveAccent`) --
   * se guarda aunque el acento activo sea otro, para que el color picker
   * recuerde la última elección si se vuelve a "Personalizado". */
  customHex: string;
  setAccent: (accent: AccentId) => void;
  setCustomHex: (hex: string) => void;
}

export const useAccentStore = create<AccentState>()(
  persist(
    (set) => ({
      accent: DEFAULT_ACCENT,
      customHex: DEFAULT_CUSTOM_HEX,
      setAccent: (accent) => set({ accent }),
      setCustomHex: (hex) => set({ customHex: hex }),
    }),
    {
      name: 'budget.accent',
      storage: createJSONStorage(() => asyncKVStorage),
      partialize: (s) => ({ accent: s.accent, customHex: s.customHex }),
    },
  ),
);
