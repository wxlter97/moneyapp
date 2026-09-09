import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';

import { BrandMark } from '@/components/BrandMark';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { FadeInView } from '@/components/ui/FadeInView';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { errorMessage, fieldErrors } from '@/api/errors';
import { useAuthStore } from '@/store/auth';
import { fonts } from '@/theme/typography';

export default function LoginScreen() {
  const status = useAuthStore((s) => s.status);
  const signIn = useAuthStore((s) => s.signIn);
  const pendingMfaToken = useAuthStore((s) => s.pendingMfaToken);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  if (status === 'authenticated') return <Redirect href="/dashboard" />;

  async function onSubmit() {
    setSubmitting(true);
    setFormError(null);
    setFields({});
    try {
      await signIn({ username: username.trim(), password });
      // Si tiene 2FA, `pendingMfaToken` queda fijado y el render de abajo
      // muestra el segundo paso solo. Si no, la redirección la hace el
      // guard al cambiar `status`.
    } catch (err) {
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo iniciar sesión.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingMfaToken) return <TwoFactorStep />;

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center"
      >
        <FadeInView>
        <View className="gap-6">
          <View className="items-center gap-3 pb-2">
            <BrandMark size={64} />
            <View className="items-center gap-1">
              <Text className="text-text text-2xl" style={{ fontFamily: fonts.extrabold, letterSpacing: -0.5 }}>
                Budget
              </Text>
              <Text className="text-text-muted">Inicia sesión para continuar.</Text>
            </View>
          </View>

          <View className="gap-4">
            <TextField
              label="Usuario"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              value={username}
              onChangeText={setUsername}
              error={fields.username}
              onSubmitEditing={onSubmit}
            />
            <TextField
              label="Contraseña"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              error={fields.password}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
          </View>

          {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

          <Button
            label="Entrar"
            loading={submitting}
            disabled={!username || !password}
            onPress={onSubmit}
          />

          <GoogleSignInButton />

          <Link href="/register" asChild>
            <Pressable className="items-center py-2 active:opacity-60">
              <Text className="text-text-muted text-sm">
                ¿No tienes cuenta? <Text className="text-primary">Crear una</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
        </FadeInView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Segundo paso del login cuando la cuenta tiene 2FA activo: usuario y
 * contraseña ya se validaron (`pendingMfaToken` lo certifica), sólo falta
 * el código de la app de autenticación -- o, si no lo tiene a mano, uno de
 * los códigos de respaldo (mismo campo, se distinguen solos por longitud). */
function TwoFactorStep() {
  const verifyTwoFactor = useAuthStore((s) => s.verifyTwoFactor);
  const cancelTwoFactor = useAuthStore((s) => s.cancelTwoFactor);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await verifyTwoFactor(code.trim());
      // la redirección la hace el guard al cambiar `status`
    } catch (err) {
      setError(errorMessage(err, 'Código inválido.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center"
      >
        <FadeInView>
          <View className="gap-6">
            <View className="items-center gap-3 pb-2">
              <BrandMark size={64} />
              <View className="items-center gap-1">
                <Text
                  className="text-text text-2xl"
                  style={{ fontFamily: fonts.extrabold, letterSpacing: -0.5 }}
                >
                  Verificación en dos pasos
                </Text>
                <Text className="text-text-muted text-center">
                  Escribí el código de tu app de autenticación (o uno de tus códigos de
                  respaldo).
                </Text>
              </View>
            </View>

            <TextField
              label="Código"
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
              error={error ?? undefined}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
              autoFocus
            />

            <Button label="Verificar" loading={submitting} disabled={!code.trim()} onPress={onSubmit} />

            <Pressable
              onPress={cancelTwoFactor}
              className="items-center py-2 active:opacity-60"
              accessibilityRole="button"
            >
              <Text className="text-text-muted text-sm">Volver</Text>
            </Pressable>
          </View>
        </FadeInView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
