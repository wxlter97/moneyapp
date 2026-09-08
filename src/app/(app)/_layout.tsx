import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect, router, Stack } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useCreateWorkspace, useWorkspaces } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { pushDevices } from '@/api/resources';
import { AppLockGate } from '@/components/security/AppLockGate';
import { addNotificationTapListener, registerForPushNotificationsAsync } from '@/lib/notifications';
import { useAuthStore } from '@/store/auth';
import { useSecurityStore } from '@/store/security';
import { useWorkspaceStore } from '@/store/workspace';
import { useColors } from '@/theme';

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center bg-bg px-8 gap-4">{children}</View>;
}

export default function AppLayout() {
  const colors = useColors();
  const status = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);

  const wsHydrated = useWorkspaceStore((s) => s.hydrated);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);
  const securityHydrated = useSecurityStore((s) => s.hydrated);

  const enabled = status === 'authenticated';
  const wsQuery = useWorkspaces({ enabled });
  const createWs = useCreateWorkspace();
  const [newName, setNewName] = useState('');
  const [createErr, setCreateErr] = useState<string | null>(null);

  async function createWorkspace() {
    setCreateErr(null);
    try {
      await createWs.mutateAsync(newName.trim());
      setNewName('');
    } catch (err) {
      setCreateErr(errorMessage(err, 'No se pudo crear el presupuesto.'));
    }
  }

  useEffect(() => {
    if (wsQuery.data) setWorkspaces(wsQuery.data);
  }, [wsQuery.data, setWorkspaces]);

  // Registro del dispositivo para recordatorios push: best-effort, sin
  // molestar si no hay permiso, es un simulador, o falta el dev build (ver
  // lib/notifications.ts) — el usuario siempre puede reintentar a mano
  // desde Herramientas → Notificaciones.
  useEffect(() => {
    if (status !== 'authenticated') return;
    registerForPushNotificationsAsync()
      .then((device) => (device ? pushDevices.register(device.token, device.platform) : undefined))
      .catch(() => {});
  }, [status]);

  // Tocar un push (recurrente/cuota/presupuesto) salta al workspace y a la
  // pantalla correspondiente, en vez de simplemente abrir la app.
  useEffect(() => {
    return addNotificationTapListener((data) => {
      if (typeof data.workspace === 'string') setActiveId(data.workspace);
      router.push(data.type === 'budget_threshold' ? '/budgets' : '/dashboard');
    });
  }, [setActiveId]);

  if (status === 'loading') {
    return (
      <Centered>
        <ActivityIndicator color={colors.primary} />
      </Centered>
    );
  }

  if (status === 'anonymous') return <Redirect href="/login" />;

  // Autenticado: esperamos a conocer los workspaces del usuario (+ el store
  // de seguridad, para que `AppLockGate` pueda leer `enabled` ya hidratado
  // en su primer render y no arriesgue un flash de contenido sin bloquear).
  if (!wsHydrated || !securityHydrated || wsQuery.isLoading) {
    return (
      <Centered>
        <ActivityIndicator color={colors.primary} />
      </Centered>
    );
  }

  if (wsQuery.isError) {
    return (
      <Centered>
        <Text className="text-text text-center">
          No se pudieron cargar tus presupuestos.
        </Text>
        <Text className="text-text-muted text-center text-sm">
          {errorMessage(wsQuery.error)}
        </Text>
        <Button label="Reintentar" onPress={() => wsQuery.refetch()} />
        <Button label="Cerrar sesión" variant="ghost" onPress={signOut} />
      </Centered>
    );
  }

  if ((wsQuery.data?.length ?? 0) === 0) {
    return (
      <Centered>
        <Text className="text-text text-lg font-semibold text-center">
          Aún no tienes ningún presupuesto
        </Text>
        <Text className="text-text-muted text-center text-sm">
          Crea uno para empezar, o pide que te inviten a uno existente.
        </Text>
        <View className="w-full max-w-[300px] gap-3">
          <TextField
            label="Nombre del presupuesto"
            placeholder="Casa, Viaje, Negocio…"
            value={newName}
            onChangeText={setNewName}
            error={createErr ?? undefined}
            onSubmitEditing={createWorkspace}
          />
          <Button
            label="Crear presupuesto"
            loading={createWs.isPending}
            disabled={!newName.trim()}
            onPress={createWorkspace}
          />
          <Button label="Cerrar sesión" variant="ghost" onPress={signOut} />
        </View>
      </Centered>
    );
  }

  if (!activeId) {
    // la lista llegó pero el store aún no fijó el activo: un frame de espera
    return (
      <Centered>
        <ActivityIndicator color={colors.primary} />
      </Centered>
    );
  }

  return (
    <AppLockGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="transaction/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="wallet/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="wallet/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="categories"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="budget-edit"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="recurring"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="recurring/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="recurring/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="installments"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="installment/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="installment/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="export"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="reset"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="category/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="category/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="imports"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="import/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="net-worth-history"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="category-transactions"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="wallet-transactions"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="members"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="invitations"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="shortcuts"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="notifications"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="security"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="currencies"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="split-transaction"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="trends"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="statements"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="statement/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="loyalty"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="tags"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="tag-transactions"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="backup"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="about"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="tools/[group]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="account"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </AppLockGate>
  );
}
