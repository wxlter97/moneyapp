import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/** Hardware con Face ID/Touch ID/huella + al menos una cara/huella enrolada. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Pide Face ID/Touch ID/huella. Nunca lanza: cancelar, fallar o que no haya
 * hardware son todos `false` — el llamador siempre puede caer al PIN.
 *
 * `disableDeviceFallback`: si Face ID falla varias veces, el sistema
 * ofrecería el PIN/patrón *del teléfono* como alternativa — no queremos eso,
 * el fallback es NUESTRO PIN (pantalla de `LockScreen`), no el del SO.
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloqueá Budget',
      cancelLabel: 'Usar PIN',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
