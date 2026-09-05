import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { PinDots } from '@/components/security/PinDots';
import { PinPad } from '@/components/security/PinPad';
import { haptics } from '@/lib/haptics';
import { isBiometricAvailable } from '@/lib/security/biometrics';
import { PIN_LENGTH, pinStore } from '@/lib/security/pin';
import { useSecurityStore } from '@/store/security';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

type WizardStep = 'idle' | 'enter' | 'confirm';
type WizardPurpose = 'enable' | 'change';

/**
 * Herramientas → Seguridad: activar el bloqueo (fuerza a elegir un PIN la
 * primera vez), Face ID/Touch ID como atajo sobre ese mismo PIN, y cambiarlo.
 * El bloqueo en sí lo aplica `AppLockGate` en `(app)/_layout.tsx`.
 */
export default function SecurityScreen() {
  const colors = useColors();
  const enabled = useSecurityStore((s) => s.enabled);
  const setEnabled = useSecurityStore((s) => s.setEnabled);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useSecurityStore((s) => s.setBiometricEnabled);

  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const [step, setStep] = useState<WizardStep>('idle');
  const [purpose, setPurpose] = useState<WizardPurpose>('enable');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [wizardError, setWizardError] = useState<string | null>(null);

  useEffect(() => {
    pinStore.hasPin().then(setHasPin);
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  function startWizard(p: WizardPurpose) {
    setPurpose(p);
    setStep('enter');
    setFirstPin('');
    setPin('');
    setWizardError(null);
  }

  function cancelWizard() {
    setStep('idle');
    setFirstPin('');
    setPin('');
    setWizardError(null);
  }

  async function onToggleEnabled(value: boolean) {
    if (!value) {
      setEnabled(false);
      return;
    }
    if (hasPin) {
      setEnabled(true);
      return;
    }
    startWizard('enable');
  }

  async function onDigit(d: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    if (step === 'enter') {
      setFirstPin(next);
      setPin('');
      setStep('confirm');
      return;
    }

    // step === 'confirm'
    if (next !== firstPin) {
      haptics.error();
      setWizardError('No coinciden — probá de nuevo.');
      setFirstPin('');
      setPin('');
      setStep('enter');
      return;
    }

    await pinStore.setPin(next);
    setHasPin(true);
    if (purpose === 'enable') setEnabled(true);
    haptics.success();
    cancelWizard();
  }

  function onBackspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Seguridad" />

      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                Bloquear la app
              </Text>
              <Text className="text-text-muted text-xs">
                Pide Face ID/Touch ID o un PIN al volver del segundo plano.
              </Text>
            </View>
            <SwitchWithColors value={enabled} onValueChange={onToggleEnabled} />
          </View>

          {enabled && biometricAvailable ? (
            <>
              <View className="my-3 h-px bg-border/30" />
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-3 pr-3">
                  <Icon name="face-id" size={18} color={colors.textMuted} />
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    Face ID / Touch ID
                  </Text>
                </View>
                <SwitchWithColors value={biometricEnabled} onValueChange={setBiometricEnabled} />
              </View>
            </>
          ) : null}

          {enabled && hasPin && step === 'idle' ? (
            <>
              <View className="my-3 h-px bg-border/30" />
              <Button label="Cambiar PIN" variant="ghost" onPress={() => startWizard('change')} />
            </>
          ) : null}
        </Card>

        {step !== 'idle' ? (
          <Card title={step === 'enter' ? 'Elegí un PIN' : 'Confirmá el PIN'}>
            <View className="items-center gap-5 py-2">
              <PinDots length={PIN_LENGTH} filled={pin.length} />
              {wizardError ? <Text className="text-expense text-xs">{wizardError}</Text> : null}
              <PinPad onDigit={onDigit} onBackspace={onBackspace} />
              <Button label="Cancelar" variant="ghost" onPress={cancelWizard} />
            </View>
          </Card>
        ) : null}

        <Text className="text-text-muted px-1 text-xs leading-4">
          El PIN se guarda sólo en este dispositivo. Si lo olvidás, la pantalla de
          bloqueo tiene la opción de cerrar sesión para poder entrar de nuevo con tu
          contraseña.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function SwitchWithColors({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const colors = useColors();
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptics.selection();
        onValueChange(v);
      }}
      trackColor={{ true: colors.primary, false: colors.surface2 }}
      thumbColor="#FFFFFF"
    />
  );
}
