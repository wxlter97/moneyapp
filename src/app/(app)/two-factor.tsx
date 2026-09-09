import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { twoFactor } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { fonts } from '@/theme/typography';

type Step =
  | 'loading'
  | 'off' // sin 2FA -- botón para arrancar
  | 'setup' // QR + secreto + código a confirmar
  | 'backup-codes' // recién activado: mostrar los códigos UNA vez
  | 'on' // activo -- desactivar / regenerar códigos
  | 'disable' // pide contraseña
  | 'regenerate'; // pide contraseña -- reusa el mismo paso que backup-codes para mostrarlos

/**
 * Herramientas → Cuenta → Seguridad → "Verificación en dos pasos". Flujo:
 * activar arma el secreto + QR, confirmarlo con un código real lo prende y
 * entrega los códigos de respaldo (una sola vez); desde ahí, desactivar o
 * regenerar códigos piden la contraseña -- no un código de 2FA, para no
 * dejar afuera a quien perdió el teléfono.
 */
export default function TwoFactorScreen() {
  const [step, setStep] = useState<Step>('loading');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshStatus();
  }, []);

  async function refreshStatus() {
    setError(null);
    try {
      const data = await twoFactor.status();
      setStep(data.enabled ? 'on' : 'off');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cargar el estado.'));
      setStep('off');
    }
  }

  async function onStartSetup() {
    setBusy(true);
    setError(null);
    try {
      const data = await twoFactor.setup();
      setSecret(data.secret);
      setOtpauthUrl(data.otpauth_url);
      setCode('');
      setStep('setup');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo generar el secreto.'));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmSetup() {
    setBusy(true);
    setError(null);
    try {
      const data = await twoFactor.enable(code.trim());
      setBackupCodes(data.backup_codes);
      setStep('backup-codes');
      haptics.success();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'Código inválido.'));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmDisable() {
    setBusy(true);
    setError(null);
    try {
      await twoFactor.disable(password);
      setPassword('');
      haptics.success();
      setStep('off');
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'Contraseña incorrecta.'));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmRegenerate() {
    setBusy(true);
    setError(null);
    try {
      const data = await twoFactor.regenerateBackupCodes(password);
      setPassword('');
      setBackupCodes(data.backup_codes);
      setStep('backup-codes');
      haptics.success();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'Contraseña incorrecta.'));
    } finally {
      setBusy(false);
    }
  }

  async function onCopySecret() {
    await Clipboard.setStringAsync(secret);
    haptics.selection();
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Verificación en dos pasos" />
      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        {step === 'loading' ? (
          <LoadingState />
        ) : step === 'off' ? (
          <Card>
            <Text className="text-text-muted text-sm">
              Sumá un código de tu app de autenticación (Google Authenticator, Authy,
              1Password...) además de la contraseña al iniciar sesión.
            </Text>
            {error ? <Text className="text-expense mt-2 text-sm">{error}</Text> : null}
            <View className="mt-3">
              <Button label="Activar" loading={busy} onPress={onStartSetup} />
            </View>
          </Card>
        ) : step === 'setup' ? (
          <Card title="1. Escaneá el código">
            <View className="items-center gap-3 py-2">
              <View className="rounded-2xl bg-white p-4">
                <QRCode value={otpauthUrl} size={180} />
              </View>
              <Text className="text-text-muted text-center text-xs">
                ¿No podés escanear? Escribí este código a mano en tu app:
              </Text>
              <Button label={secret} variant="ghost" onPress={onCopySecret} />
            </View>

            <View className="my-1 h-px bg-border/30" />

            <Text className="text-text-muted mt-3 text-sm">2. Escribí el código que te muestra</Text>
            <TextField
              label="Código"
              autoCapitalize="none"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
              error={error ?? undefined}
              keyboardType="number-pad"
            />
            <View className="mt-2 gap-2">
              <Button
                label="Confirmar"
                loading={busy}
                disabled={!code.trim()}
                onPress={onConfirmSetup}
              />
              <Button label="Cancelar" variant="ghost" onPress={() => setStep('off')} />
            </View>
          </Card>
        ) : step === 'backup-codes' ? (
          <Card title="Códigos de respaldo">
            <Text className="text-text-muted text-sm">
              Guardalos en un lugar seguro: cada uno sirve UNA vez para entrar si perdés el
              acceso a tu app de autenticación. No se vuelven a mostrar.
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {backupCodes.map((c) => (
                <View key={c} className="rounded-lg bg-surface-2 px-3 py-2">
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
            <View className="mt-4">
              <Button label="Ya los guardé" onPress={() => setStep('on')} />
            </View>
          </Card>
        ) : step === 'on' ? (
          <>
            <Card>
              <Text className="text-income text-sm" style={{ fontFamily: fonts.semibold }}>
                Activa
              </Text>
              <Text className="text-text-muted mt-1 text-xs">
                Tu cuenta pide un código además de la contraseña al iniciar sesión.
              </Text>
            </Card>
            <Card>
              <Button
                label="Generar nuevos códigos de respaldo"
                variant="ghost"
                onPress={() => {
                  setPassword('');
                  setError(null);
                  setStep('regenerate');
                }}
              />
              <View className="my-1 h-px bg-border/30" />
              <Button
                label="Desactivar"
                variant="ghost"
                onPress={() => {
                  setPassword('');
                  setError(null);
                  setStep('disable');
                }}
              />
            </Card>
          </>
        ) : (
          // disable | regenerate: piden la contraseña
          <Card title={step === 'disable' ? 'Desactivar 2FA' : 'Nuevos códigos de respaldo'}>
            <Text className="text-text-muted text-sm">
              {step === 'disable'
                ? 'Escribí tu contraseña para desactivarlo.'
                : 'Los códigos anteriores dejan de servir. Escribí tu contraseña para generar otros.'}
            </Text>
            <View className="mt-3">
              <TextField
                label="Contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                error={error ?? undefined}
                onSubmitEditing={step === 'disable' ? onConfirmDisable : onConfirmRegenerate}
              />
            </View>
            <View className="mt-2 gap-2">
              <Button
                label={step === 'disable' ? 'Desactivar' : 'Generar'}
                loading={busy}
                disabled={!password}
                onPress={step === 'disable' ? onConfirmDisable : onConfirmRegenerate}
              />
              <Button label="Cancelar" variant="ghost" onPress={() => setStep('on')} />
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
