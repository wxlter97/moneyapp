import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { changePassword, setPassword as setPasswordApi } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { dismissModal, ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { haptics } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';

/** Refleja en el store que la cuenta ya tiene contraseña -- Cuenta lee esto
 * para no volver a mostrar "Agregar contraseña" sin pedir `/auth/me/` de nuevo. */
function setHasPasswordInStore() {
  useAuthStore.setState((s) => (s.user ? { user: { ...s.user, has_password: true } } : s));
}

/**
 * Herramientas → Cuenta → Contraseña. Dos variantes de la misma pantalla:
 * - Ya tiene contraseña (`user.has_password`): "Cambiar contraseña", pide la
 *   actual antes de la nueva (`POST /auth/password/change/`).
 * - Cuenta de solo Google (sin contraseña utilizable): "Agregar contraseña",
 *   sin pedir una "actual" porque no existe (`POST /auth/password/set/`) --
 *   así puede entrar también con usuario/contraseña, no solo con Google.
 */
export default function PasswordScreen() {
  const user = useAuthStore((s) => s.user);
  const hasPassword = user?.has_password ?? true;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    (!hasPassword || currentPassword.length > 0) &&
    newPassword.length > 0 &&
    confirmPassword === newPassword &&
    !busy;

  async function onSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (hasPassword) {
        await changePassword(currentPassword, newPassword);
      } else {
        await setPasswordApi(newPassword);
      }
      setHasPasswordInStore();
      haptics.success();
      dismissModal();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo guardar la contraseña.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={hasPassword ? 'Cambiar contraseña' : 'Agregar contraseña'} />
      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        <Card>
          {!hasPassword ? (
            <Text className="text-text-muted mb-3 text-sm leading-5">
              Tu cuenta entra solo con "Continuar con Google". Agregá una contraseña para poder
              entrar también con tu usuario, sin perder el acceso por Google.
            </Text>
          ) : null}

          {hasPassword ? (
            <TextField
              label="Contraseña actual"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoCapitalize="none"
            />
          ) : null}
          <TextField
            label="Nueva contraseña"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
          />
          <TextField
            label="Confirmar nueva contraseña"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            error={mismatch ? 'No coincide con la nueva contraseña.' : undefined}
            onSubmitEditing={onSubmit}
          />

          {error ? <Text className="text-expense mt-1 text-sm">{error}</Text> : null}

          <View className="mt-3">
            <Button
              label={hasPassword ? 'Cambiar contraseña' : 'Agregar contraseña'}
              loading={busy}
              disabled={!canSubmit}
              onPress={onSubmit}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
