import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useCreateWorkspace, useWorkspaces } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center bg-bg px-8 gap-4">{children}</View>;
}

export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);

  const wsHydrated = useWorkspaceStore((s) => s.hydrated);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);

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

  if (status === 'loading') {
    return (
      <Centered>
        <ActivityIndicator color="#4F8CFF" />
      </Centered>
    );
  }

  if (status === 'anonymous') return <Redirect href="/login" />;

  // Autenticado: esperamos a conocer los workspaces del usuario.
  if (!wsHydrated || wsQuery.isLoading) {
    return (
      <Centered>
        <ActivityIndicator color="#4F8CFF" />
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
        <ActivityIndicator color="#4F8CFF" />
      </Centered>
    );
  }

  return (
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
    </Stack>
  );
}
