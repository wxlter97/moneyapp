import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { deleteAccount } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { haptics } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';

const CONFIRM_WORD = 'BORRAR';

/**
 * Herramientas → Cuenta → Borrar cuenta. Irreversible -- ver
 * `apps.users.services.delete_own_account` del backend para qué pasa con
 * cada workspace: los que son sólo tuyos se borran enteros con vos, los
 * compartidos donde sos owner bloquean el borrado hasta que transfieras la
 * propiedad o saques al resto, y de los que sólo sos miembro simplemente
 * te vas (siguen para el resto).
 *
 * Dos capas de confirmación a propósito: tipear "BORRAR" (no se puede
 * apretar el botón por error) + la contraseña real, si la cuenta tiene una
 * (una cuenta de solo Google no tiene qué probar, ver `has_password`).
 */
export default function DeleteAccountScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const hasPassword = user?.has_password ?? true;

  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = typed.trim() === CONFIRM_WORD && (!hasPassword || password.length > 0) && !busy;

  async function onSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(hasPassword ? { password } : { confirm: true });
      haptics.success();
      await signOut();
      router.replace('/login');
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo borrar la cuenta.'));
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Borrar cuenta" />
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        <Card title="Esto es permanente">
          <Text className="text-text-muted text-sm leading-5">
            Se borra tu cuenta y todo presupuesto que sea sólo tuyo (carteras, transacciones,
            categorías, todo). No hay forma de deshacerlo después.{'\n\n'}
            Si sos dueño de un presupuesto compartido con otras personas, primero tenés que
            transferirlo o sacar a los demás miembros -- no se puede borrar mientras alguien más
            dependa de él.
          </Text>
        </Card>

        <Card title="Confirmar">
          <View className="gap-3">
            <TextField
              label={`Escribí "${CONFIRM_WORD}" para confirmar`}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={CONFIRM_WORD}
            />
            {hasPassword ? (
              <TextField
                label="Tu contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            ) : null}
            {error ? <Text className="text-expense text-sm">{error}</Text> : null}
            <Button
              label="Borrar mi cuenta"
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
