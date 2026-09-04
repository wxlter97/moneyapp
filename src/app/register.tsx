import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Link, Redirect, router } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { errorMessage, fieldErrors } from '@/api/errors';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/theme';

export default function RegisterScreen() {
  const colors = useColors();
  const status = useAuthStore((s) => s.status);
  const signUp = useAuthStore((s) => s.signUp);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  if (status === 'authenticated') return <Redirect href="/dashboard" />;

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const canSubmit = form.username && form.email && form.password.length >= 8;

  async function onSubmit() {
    setSubmitting(true);
    setFormError(null);
    setFields({});
    try {
      await signUp({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
      });
    } catch (err) {
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo crear la cuenta.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="grow justify-center gap-6 py-6" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              className="h-8 w-8 items-center justify-center rounded-full bg-surface-2 active:opacity-60"
            >
              <Icon name="chevron-left" size={18} color={colors.text} />
            </Pressable>
            <Text className="text-text text-2xl font-bold">Crear cuenta</Text>
          </View>

          <View className="gap-4">
            <TextField
              label="Usuario"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.username}
              onChangeText={set('username')}
              error={fields.username}
            />
            <TextField
              label="Correo"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={form.email}
              onChangeText={set('email')}
              error={fields.email}
            />
            <TextField
              label="Contraseña"
              secureTextEntry
              value={form.password}
              onChangeText={set('password')}
              error={fields.password}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label="Nombre"
                  value={form.first_name}
                  onChangeText={set('first_name')}
                  error={fields.first_name}
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Apellido"
                  value={form.last_name}
                  onChangeText={set('last_name')}
                  error={fields.last_name}
                />
              </View>
            </View>
          </View>

          {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

          <Button
            label="Crear cuenta"
            loading={submitting}
            disabled={!canSubmit}
            onPress={onSubmit}
          />

          <Link href="/login" asChild>
            <Pressable className="items-center py-1 active:opacity-60">
              <Text className="text-text-muted text-sm">
                ¿Ya tienes cuenta? <Text className="text-primary">Inicia sesión</Text>
              </Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
