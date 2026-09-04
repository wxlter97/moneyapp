import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useCreateWorkspace } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { useWorkspaceStore } from '@/store/workspace';
import { FadeInView } from './ui/FadeInView';
import { Icon } from './ui/Icon';

/**
 * Selector "Casa ⌄": cambia el workspace activo o crea uno nuevo.
 * El panel se expande en el flujo normal (empuja el contenido), sin Modal
 * ni posicionamiento absoluto — evita problemas de z-index en web.
 */
export function WorkspaceSwitcher() {
  const colors = useColors();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);
  const create = useCreateWorkspace();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const active = workspaces.find((w) => w.id === activeId);

  function close() {
    setOpen(false);
    setCreating(false);
    setName('');
    setError(null);
  }

  async function submitNew() {
    setError(null);
    try {
      await create.mutateAsync(name.trim());
      haptics.success();
      close();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo crear el presupuesto.'));
    }
  }

  return (
    <View className="flex-1 pr-3">
      <Pressable
        onPress={() => {
          haptics.tap();
          if (open) close();
          else setOpen(true);
        }}
        className="flex-row items-center gap-1 self-start py-0.5 active:opacity-70"
        accessibilityRole="button"
      >
        <Text className="text-text text-lg font-semibold">{active?.name ?? '—'}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <FadeInView>
          <View className="mt-2 rounded-2xl border border-border/70 bg-surface-2 p-2">
            {workspaces.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => {
                  haptics.selection();
                  setActiveId(w.id);
                  close();
                }}
                className="flex-row items-center justify-between rounded-xl px-3 py-2.5 active:bg-surface"
              >
                <View>
                  <Text className="text-text text-base">{w.name}</Text>
                  <Text className="text-text-muted text-xs">
                    {w.role || 'miembro'} · {w.member_count}{' '}
                    {w.member_count === 1 ? 'miembro' : 'miembros'}
                  </Text>
                </View>
                {w.id === activeId ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            ))}

            <View className="my-1 h-px bg-border" />

            {creating ? (
              <View className="gap-2 p-1">
                <TextInput
                  autoFocus
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre del presupuesto"
                  placeholderTextColor="#6B7480"
                  className="h-10 rounded-lg border border-border bg-surface px-2 text-text"
                  onSubmitEditing={submitNew}
                />
                {error ? <Text className="text-expense text-xs">{error}</Text> : null}
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setCreating(false)}
                    className="flex-1 items-center rounded-lg border border-border py-2 active:opacity-70"
                  >
                    <Text className="text-text-muted text-sm">Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={submitNew}
                    disabled={!name.trim() || create.isPending}
                    className={`flex-1 items-center rounded-lg bg-primary py-2 ${
                      !name.trim() || create.isPending ? 'opacity-50' : 'active:opacity-80'
                    }`}
                  >
                    <Text className="text-primary-fg text-sm font-semibold">
                      {create.isPending ? '…' : 'Crear'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setCreating(true)}
                className="flex-row items-center gap-1.5 rounded-xl px-3 py-2.5 active:bg-surface"
              >
                <Icon name="plus" size={16} color={colors.primary} />
                <Text className="text-primary text-base">Nuevo presupuesto</Text>
              </Pressable>
            )}
          </View>
        </FadeInView>
      ) : null}
    </View>
  );
}
