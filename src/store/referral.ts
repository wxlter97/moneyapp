/**
 * Código de influencer con el que llegó este dispositivo (`?ref=ANA30` en
 * cualquier enlace a la app, ver `captureReferralFromUrl`). Se guarda hasta que
 * se crea una cuenta (registro o Google), que lo manda al backend: ahí se
 * atribuye al influencer y se canjea el beneficio del código. Primer enlace
 * gana, y vence a los 30 días, como una cookie de afiliado.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncKVStorage } from './kvStorage';

const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface ReferralState {
  code: string | null;
  capturedAt: number | null;
  capture: (code: string) => void;
  clear: () => void;
}

export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      code: null,
      capturedAt: null,
      capture: (code) => {
        const normalized = code.trim().toUpperCase().slice(0, 40);
        if (!normalized || getPendingReferral(get()) !== null) return;
        set({ code: normalized, capturedAt: Date.now() });
      },
      clear: () => set({ code: null, capturedAt: null }),
    }),
    { name: 'budget.referral', storage: createJSONStorage(() => asyncKVStorage) },
  ),
);

/** El código todavía vigente, o `null`. */
export function getPendingReferral(
  state: Pick<ReferralState, 'code' | 'capturedAt'> = useReferralStore.getState(),
): string | null {
  if (!state.code || state.capturedAt == null) return null;
  return Date.now() - state.capturedAt > REFERRAL_TTL_MS ? null : state.code;
}

/** Guarda el `ref` de un enlace entrante, si trae uno. */
export function captureReferralFromUrl(url: string | null | undefined): void {
  if (!url) return;
  // A mano en vez de `URL`/`ExpoLinking.parse`: el `URL` de React Native no
  // implementa `searchParams`, y sólo hace falta un parámetro.
  const match = /[?&]ref=([^&#]*)/.exec(url);
  if (!match) return;
  try {
    const ref = decodeURIComponent(match[1].replace(/\+/g, ' '));
    // Antes de rehidratar, lo guardado (aunque sea `null`) pisaría lo capturado.
    const { persist: store } = useReferralStore;
    if (store.hasHydrated()) useReferralStore.getState().capture(ref);
    else {
      const unsub = store.onFinishHydration(() => {
        unsub();
        useReferralStore.getState().capture(ref);
      });
    }
  } catch {
    // URL rara: no hay nada que atribuir.
  }
}
