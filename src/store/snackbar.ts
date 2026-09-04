import { create } from 'zustand';

interface ShowOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Se dispara solo si se deja vencer el tiempo (no si se llama a `hide()` a mano). */
  onTimeout?: () => void;
  /** ms visible antes de auto-ocultarse. */
  duration?: number;
}

interface SnackbarState {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  show: (opts: ShowOptions) => void;
  /** Oculta ya (p. ej. al tocar la acción) y cancela el `onTimeout` pendiente. */
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * Snackbar global de una sola línea (p. ej. "Eliminado · Deshacer"). Un solo
 * mensaje a la vez: mostrar uno nuevo reemplaza al anterior sin disparar su
 * `onTimeout` (ya se está mostrando otra cosa, no venció solo).
 */
export const useSnackbarStore = create<SnackbarState>((set) => ({
  visible: false,
  message: '',
  actionLabel: undefined,
  onAction: undefined,

  show: ({ message, actionLabel, onAction, onTimeout, duration = 4000 }) => {
    clearTimer();
    set({ visible: true, message, actionLabel, onAction });
    timer = setTimeout(() => {
      timer = null;
      set({ visible: false });
      onTimeout?.();
    }, duration);
  },

  hide: () => {
    clearTimer();
    set({ visible: false });
  },
}));
