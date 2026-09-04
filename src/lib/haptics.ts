import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Envoltorio de `expo-haptics`: no falla en web (donde no hay motor de
 * vibración) y evita repetir `void ...catch` en cada callsite.
 */
function safe(run: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  run().catch(() => {});
}

export const haptics = {
  /** Toque liviano: cambiar de tab, seleccionar una opción. */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Toque medio: confirmar una acción con peso (guardar, crear). */
  impact: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Selección discreta: mover un dial, tipear en el numpad. */
  selection: () => safe(() => Haptics.selectionAsync()),
  /** Resultado positivo: transacción creada, guardado exitoso. */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Resultado negativo: error de validación o de red. */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** Advertencia: sobregiro de presupuesto, saldo negativo. */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
