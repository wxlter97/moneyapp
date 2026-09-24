import { errorMessage } from '@/api/errors';
import { useSnackbarStore } from '@/store/snackbar';

import { haptics } from './haptics';
import { isPlanUpgradeError } from './planErrors';

/**
 * Para las acciones de un toque (quitar, confirmar, liquidar…) que no tienen
 * un lugar propio donde pintar el error: vibra y lo muestra en el snackbar.
 * Antes varias sólo vibraban, y en la web (sin vibración) un fallo no dejaba
 * ningún rastro: el botón simplemente "no hacía nada". Si el error es de
 * límite de plan, el snackbar ofrece ir a ver los planes.
 */
export function notifyError(err: unknown, fallback: string) {
  haptics.error();
  const message = errorMessage(err, fallback);
  useSnackbarStore.getState().show({
    message,
    duration: 6000,
    ...(isPlanUpgradeError(message) && {
      actionLabel: 'Ver planes',
      // Import diferido: este helper lo usan componentes chicos (p. ej.
      // `ReceiptField`) que no deberían arrastrar el router al cargarse.
      onAction: () => {
        void import('expo-router').then(({ router }) => router.push('/pro'));
      },
    }),
  });
}
