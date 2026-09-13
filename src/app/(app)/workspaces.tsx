import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useCreateWorkspace, useDeleteWorkspace, useRenameWorkspace } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { Workspace } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { EmptyState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * Herramientas → Cuenta → Presupuestos: todos los presupuestos a los que
 * pertenecés en un solo lugar -- hasta ahora no había forma de verlos, crear
 * uno nuevo, renombrar o borrar sin pasar por acá (la única entrada era el
 * que quedaba activo al último). El backend ya tenía todo esto
 * (`WorkspaceViewSet`); esta pantalla era la pieza que faltaba.
 */
export default function WorkspacesScreen() {
  const colors = useColors();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);

  const create = useCreateWorkspace();
  const rename = useRenameWorkspace();
  const del = useDeleteWorkspace();

  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function onSwitch(w: Workspace) {
    if (w.id === activeId) return;
    haptics.selection();
    setActiveId(w.id);
  }

  function onStartRename(w: Workspace) {
    haptics.tap();
    setEditingId(w.id);
    setEditName(w.name);
    setRowError(null);
  }

  async function onConfirmRename(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setBusyId(id);
    setRowError(null);
    try {
      await rename.mutateAsync({ id, name: trimmed });
      haptics.success();
      setEditingId(null);
    } catch (err) {
      haptics.error();
      setRowError(errorMessage(err, 'No se pudo renombrar.'));
    } finally {
      setBusyId(null);
    }
  }

  async function onConfirmDelete(id: string) {
    setBusyId(id);
    setRowError(null);
    try {
      await del.mutateAsync(id);
      haptics.success();
      setConfirmDeleteId(null);
    } catch (err) {
      haptics.error();
      setRowError(errorMessage(err, 'No se pudo borrar.'));
    } finally {
      setBusyId(null);
    }
  }

  async function onCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreateError(null);
    try {
      await create.mutateAsync(trimmed);
      haptics.success();
      setNewName('');
    } catch (err) {
      haptics.error();
      setCreateError(errorMessage(err, 'No se pudo crear el presupuesto.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Presupuestos" />
      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        {workspaces.length === 0 ? (
          <EmptyState title="Sin presupuestos" hint="Algo salió mal: siempre debería haber al menos uno." />
        ) : (
          <Card>
            {workspaces.map((w, i) => {
              const isActive = w.id === activeId;
              const isOwner = w.role === 'owner';
              const isEditing = editingId === w.id;
              const isConfirmingDelete = confirmDeleteId === w.id;
              const isLastOne = workspaces.length <= 1;

              return (
                <View key={w.id}>
                  {i > 0 ? <View className="h-px bg-border/30" /> : null}

                  {isEditing ? (
                    <View className="gap-2 py-3">
                      <TextField
                        label="Nombre"
                        value={editName}
                        onChangeText={setEditName}
                        autoFocus
                        onSubmitEditing={() => onConfirmRename(w.id)}
                        error={rowError ?? undefined}
                      />
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <Button
                            label="Cancelar"
                            variant="ghost"
                            onPress={() => {
                              setEditingId(null);
                              setRowError(null);
                            }}
                          />
                        </View>
                        <View className="flex-1">
                          <Button
                            label="Guardar"
                            loading={busyId === w.id}
                            disabled={!editName.trim()}
                            onPress={() => onConfirmRename(w.id)}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => onSwitch(w)}
                      accessibilityRole="button"
                      className="flex-row items-center gap-3 py-3 active:opacity-70"
                    >
                      <View
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: isActive ? colors.primary : colors.surface2 }}
                      >
                        <Icon
                          name="card"
                          size={16}
                          color={isActive ? '#FFFFFF' : colors.textMuted}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-text text-base"
                          style={{ fontFamily: fonts.semibold }}
                          numberOfLines={1}
                        >
                          {w.name}
                        </Text>
                        <Text className="text-text-muted text-xs" numberOfLines={1}>
                          {isOwner ? 'Dueño' : 'Miembro'} · {w.member_count}{' '}
                          {w.member_count === 1 ? 'persona' : 'personas'}
                        </Text>
                      </View>
                      {isActive ? <Icon name="check" size={18} color={colors.primary} /> : null}
                    </Pressable>
                  )}

                  {!isEditing && isOwner ? (
                    isConfirmingDelete ? (
                      <View className="mb-3 gap-2 rounded-2xl bg-expense/10 p-3">
                        <Text className="text-text text-sm">
                          ¿Borrar {w.name}? Se pierden sus carteras, movimientos y categorías. No
                          se puede deshacer.
                        </Text>
                        {rowError ? <Text className="text-expense text-xs">{rowError}</Text> : null}
                        <View className="flex-row gap-2">
                          <View className="flex-1">
                            <Button
                              label="Cancelar"
                              variant="ghost"
                              onPress={() => {
                                setConfirmDeleteId(null);
                                setRowError(null);
                              }}
                            />
                          </View>
                          <View className="flex-1">
                            <Button
                              label="Borrar"
                              loading={busyId === w.id}
                              onPress={() => onConfirmDelete(w.id)}
                            />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View className="mb-3 flex-row gap-2">
                        <Pressable
                          onPress={() => onStartRename(w)}
                          className="flex-1 items-center rounded-full border border-border py-2 active:opacity-70"
                          accessibilityRole="button"
                        >
                          <Text className="text-text text-xs" style={{ fontFamily: fonts.semibold }}>
                            Renombrar
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            if (isLastOne) return;
                            setConfirmDeleteId(w.id);
                            setRowError(null);
                          }}
                          disabled={isLastOne}
                          className="flex-1 items-center rounded-full border border-border py-2 active:opacity-70 disabled:opacity-40"
                          accessibilityRole="button"
                        >
                          <Text className="text-expense text-xs" style={{ fontFamily: fonts.semibold }}>
                            Borrar
                          </Text>
                        </Pressable>
                      </View>
                    )
                  ) : null}
                </View>
              );
            })}
          </Card>
        )}

        <Card title="Nuevo presupuesto">
          <View className="gap-3">
            <TextField
              label="Nombre del nuevo presupuesto"
              placeholder="Casa, Viaje, Negocio..."
              value={newName}
              onChangeText={(t) => {
                setNewName(t);
                if (createError) setCreateError(null);
              }}
              error={createError ?? undefined}
              onSubmitEditing={onCreate}
            />
            <Button
              label="Crear"
              loading={create.isPending}
              disabled={!newName.trim()}
              onPress={onCreate}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
