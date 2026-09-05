import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { PinDots } from './PinDots';
import { PinPad } from './PinPad';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import { authenticateWithBiometrics } from '@/lib/security/biometrics';
import { PIN_LENGTH, pinStore } from '@/lib/security/pin';
import { useAuthStore } from '@/store/auth';
import { useSecurityStore } from '@/store/security';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface LockScreenProps {
  onUnlock: () => void;
  biometricAvailable: boolean;
}

/**
 * Overlay de pantalla completa que tapa TODO el contenido de la app hasta
 * que se verifica Face ID/Touch ID o el PIN. `AppLockGate` decide cuándo
 * montarla (background→foreground, arranque en frío); acá sólo importa
 * cómo se sale de ella.
 */
export function LockScreen({ onUnlock, biometricAvailable }: LockScreenProps) {
  const colors = useColors();
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);
  const signOut = useAuthStore((s) => s.signOut);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkingBiometric, setCheckingBiometric] = useState(biometricAvailable && biometricEnabled);
  const [signingOut, setSigningOut] = useState(false);

  const tryBiometric = useCallback(async () => {
    setCheckingBiometric(true);
    setError(null);
    const ok = await authenticateWithBiometrics();
    setCheckingBiometric(false);
    if (ok) onUnlock();
  }, [onUnlock]);

  useEffect(() => {
    if (biometricAvailable && biometricEnabled) tryBiometric();
    // sólo al montar: cada reaparición de LockScreen es un montaje nuevo
    // (ver AppLockGate), así que esto ya cubre cada bloqueo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDigit(d: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    setError(null);
    if (next.length === PIN_LENGTH) {
      const ok = await pinStore.verifyPin(next);
      if (ok) {
        onUnlock();
      } else {
        haptics.error();
        setError('PIN incorrecto');
        setPin('');
      }
    }
  }

  function onBackspace() {
    setPin((p) => p.slice(0, -1));
    setError(null);
  }

  async function onForgotPin() {
    setSigningOut(true);
    // No hay forma de "recuperar" un PIN local: la salida honesta es pedir
    // de nuevo la contraseña real de la cuenta y arrancar de cero el
    // bloqueo (no se pierde ningún dato, sólo esta conveniencia local).
    await pinStore.clearPin();
    useSecurityStore.getState().setEnabled(false);
    await signOut().catch(() => {});
  }

  return (
    <View className="bg-bg absolute inset-0 z-50 items-center justify-center gap-8 px-8">
      <View className="items-center gap-2">
        <View className="bg-surface-2 h-16 w-16 items-center justify-center rounded-full">
          <Icon name="lock" size={26} color={colors.text} />
        </View>
        <Text className="text-text text-lg" style={{ fontFamily: fonts.bold }}>
          Budget bloqueado
        </Text>
      </View>

      {checkingBiometric ? (
        <View className="items-center gap-3">
          <ActivityIndicator color={colors.textMuted} />
          <Text className="text-text-muted text-sm">Verificando Face ID…</Text>
        </View>
      ) : (
        <>
          <View className="items-center gap-4">
            <PinDots length={PIN_LENGTH} filled={pin.length} />
            <Text className="text-expense h-4 text-xs">{error ?? ''}</Text>
          </View>

          <PinPad onDigit={onDigit} onBackspace={onBackspace} />

          {biometricAvailable && biometricEnabled ? (
            <Pressable onPress={tryBiometric} accessibilityRole="button" className="py-1 active:opacity-60">
              <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                Reintentar Face ID
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onForgotPin}
            disabled={signingOut}
            accessibilityRole="button"
            className="py-1 active:opacity-60"
          >
            <Text className="text-text-muted text-xs">
              {signingOut ? 'Cerrando sesión…' : '¿Olvidaste el PIN? Cerrar sesión'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
