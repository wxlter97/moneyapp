import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useResetWorkspace } from '@/api/queries';
import type { ResetScope } from '@/api/resources';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { dismissModal, ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { fonts } from '@/theme/typography';
import { useWorkspaceStore } from '@/store/workspace';

const OPTIONS: { value: ResetScope; title: string; hint: string }[] = [
  {
    value: 'movimientos',
    title: 'Solo movimientos',
    hint: 'Borra transacciones, recurrentes, cuotas y presupuestos. Deja las carteras (con su saldo inicial) y las categorías.',
  },
  {
    value: 'todo',
    title: 'Todo',
    hint: 'Además borra las carteras y las categorías. El presupuesto (workspace) y sus miembros se conservan.',
  },
];

export default function ResetScreen() {
  const activeId = useWorkspaceStore((s) => s.activeId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const active = workspaces.find((w) => w.id === activeId);
  const reset = useResetWorkspace();

  const [scope, setScope] = useState<ResetScope>('movimientos');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  const target = active?.name ?? '';
  const canRun = typed.trim() === target && !!activeId && !reset.isPending;

  async function onRun() {
    if (!activeId) return;
    setError(null);
    try {
      await reset.mutateAsync({ id: activeId, scope });
      dismissModal();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo reiniciar.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Restablecer datos" />
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        <View className="rounded-2xl bg-expense/10 p-3">
          <Text className="text-text text-sm">
            Esto borra datos de{' '}
            <Text className="text-text text-sm" style={{ fontFamily: fonts.bold }}>
              {target}
            </Text>{' '}
            de forma permanente. No se puede deshacer.
          </Text>
        </View>

        {OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => {
              haptics.selection();
              setScope(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: scope === o.value }}
            className={`rounded-2xl border p-3 ${
              scope === o.value ? 'border-primary bg-surface-2' : 'border-transparent bg-surface-2/50'
            }`}
          >
            <Text className="text-text text-sm" style={{ fontFamily: fonts.bold }}>
              {o.title}
            </Text>
            <Text className="text-text-muted mt-1 text-xs">{o.hint}</Text>
          </Pressable>
        ))}

        <TextField
          label={`Escribe "${target}" para confirmar`}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="none"
          placeholder={target}
        />

        {error ? <Text className="text-expense text-sm">{error}</Text> : null}

        <Button
          label={scope === 'todo' ? 'Borrar todo' : 'Borrar movimientos'}
          loading={reset.isPending}
          disabled={!canRun}
          onPress={onRun}
        />
      </ScrollView>
    </Screen>
  );
}
