/**
 * Preferencia de bloqueo de la app: activado + si además admite Face
 * ID/Touch ID. El PIN en sí NO vive acá (va hasheado en SecureStore, ver
 * `lib/security/pin.ts`) — esto son sólo flags de UI, igual que el tema.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';

interface SecurityState {
  enabled: boolean;
  biometricEnabled: boolean;
  hydrated: boolean;
  setEnabled: (v: boolean) => void;
  setBiometricEnabled: (v: boolean) => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      enabled: false,
      biometricEnabled: true, // si hay hardware, se prefiere por defecto una vez activado el PIN
      hydrated: false,
      setEnabled: (enabled) => set({ enabled }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
    }),
    {
      name: 'budget.security',
      storage: createJSONStorage(() => asyncKVStorage),
      partialize: (s) => ({ enabled: s.enabled, biometricEnabled: s.biometricEnabled }),
      onRehydrateStorage: () => () => {
        useSecurityStore.setState({ hydrated: true });
      },
    },
  ),
);
