import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useCreateTag, useDeleteTag, useTagSummary } from '@/api/queries';
import type { TagSummary } from '@/api/types';
import { errorMessage } from '@/api/errors';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * Etiquetas libres: transversales a la categoría, para agrupar gasto que
 * cruza varias (p. ej. "viaje-cancún" = comida + transporte + hospedaje).
 * Se crean al vuelo desde una transacción; acá se ven todas con su total
 * acumulado, y se puede crear una de antemano, renombrar o borrar.
 */
export default function TagsScreen() {
  const colors = useColors();
  const q = useTagSummary();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const items = useMemo(
    () => [...(q.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [q.data],
  );

  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());

  async function onCreate() {
    const name = draft.trim();
    if (!name) return;
    setDraftError(null);
    try {
      await createTag.mutateAsync(name);
      setDraft('');
      setAdding(false);
      haptics.success();
    } catch (err) {
      setDraftError(errorMessage(err, 'No se pudo crear la etiqueta.'));
    }
  }

  async function onDelete(tag: TagSummary) {
    haptics.impact();
    try {
      await deleteTag.mutateAsync(tag.id);
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Etiquetas" />
      <Pressable
        onPress={() => {
          haptics.tap();
          setAdding((v) => !v);
        }}
        className="flex-row items-center gap-1 self-end rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
        accessibilityRole="button"
      >
        <Icon name="plus" size={13} color={colors.primary} />
        <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
          Nueva
        </Text>
      </Pressable>

      <ScrollView
        contentContainerClassName="gap-3 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        {adding ? (
          <Card>
            <View className="flex-row items-center gap-2">
              <TextInput
                autoFocus
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={onCreate}
                placeholder="Nombre de la etiqueta"
                maxLength={40}
                className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-text"
              />
              <Pressable
                onPress={onCreate}
                disabled={!draft.trim() || createTag.isPending}
                className="bg-primary h-11 items-center justify-center rounded-xl px-4 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-primary-fg text-sm" style={{ fontFamily: fonts.semibold }}>
                  Crear
                </Text>
              </Pressable>
            </View>
            {draftError ? <Text className="text-expense mt-2 text-xs">{draftError}</Text> : null}
          </Card>
        ) : null}

        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin etiquetas"
            hint="Créalas acá, o escribí un nombre nuevo directamente al elegir etiquetas en una transacción."
          />
        ) : (
          <Card>
            {items.map((tag, i) => (
              <TagRow
                key={tag.id}
                tag={tag}
                currency={currency}
                first={i === 0}
                confirming={confirmingId === tag.id}
                onPress={() => router.push(`/tag-transactions?tag=${tag.id}`)}
                onAskDelete={() => setConfirmingId(tag.id)}
                onCancelDelete={() => setConfirmingId(null)}
                onConfirmDelete={() => onDelete(tag)}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function TagRow({
  tag,
  currency,
  first,
  confirming,
  onPress,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  tag: TagSummary;
  currency: string;
  first: boolean;
  confirming: boolean;
  onPress: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const colors = useColors();

  if (confirming) {
    return (
      <View className={`flex-row items-center gap-2 py-3 ${first ? '' : 'border-t border-border/30'}`}>
        <Text className="text-text-muted flex-1 text-sm" numberOfLines={1}>
          ¿Borrar «{tag.name}»? Las transacciones se conservan, sin esta etiqueta.
        </Text>
        <Pressable
          onPress={onCancelDelete}
          className="rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
          accessibilityRole="button"
        >
          <Text className="text-text-muted text-xs">Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={onConfirmDelete}
          className="bg-expense/10 rounded-full px-3 py-1.5 active:opacity-70"
          accessibilityRole="button"
        >
          <Text className="text-expense text-xs" style={{ fontFamily: fonts.semibold }}>
            Borrar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 py-3 active:opacity-60 ${
        first ? '' : 'border-t border-border/30'
      }`}
      accessibilityRole="button"
    >
      <View className="bg-surface-2 h-9 w-9 items-center justify-center rounded-full">
        <Icon name="hash" size={16} color={colors.text} />
      </View>
      <View className="flex-1">
        <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {tag.name}
        </Text>
        <Text className="text-text-muted text-xs" numberOfLines={1}>
          {tag.count === 0 ? 'Sin movimientos' : `${tag.count} movimiento${tag.count === 1 ? '' : 's'}`}
        </Text>
      </View>
      {tag.count > 0 ? (
        <Money value={tag.expense} currency={currency} tone="expense" className="text-sm font-semibold" />
      ) : null}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          haptics.tap();
          onAskDelete();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Borrar etiqueta ${tag.name}`}
      >
        <Icon name="trash" size={16} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}
