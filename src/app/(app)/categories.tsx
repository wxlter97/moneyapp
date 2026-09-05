import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  useCategories,
  useDeletedCategories,
  useHardDeleteCategory,
  useReorderCategories,
  useRestoreCategory,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { Category, CategoryType } from '@/api/types';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { DragList } from '@/components/ui/DragList';
import { Icon } from '@/components/ui/Icon';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const SECTIONS: { type: CategoryType; title: string }[] = [
  { type: 'expense', title: 'Gastos' },
  { type: 'income', title: 'Ingresos' },
];

interface GroupTree {
  group: Category;
  children: Category[];
}

export default function CategoriesScreen() {
  const colors = useColors();
  const categoriesQ = useCategories();
  const reorder = useReorderCategories();
  const [reordering, setReordering] = useState(false);

  const trees = useMemo(() => {
    const map: Record<CategoryType, GroupTree[]> = { expense: [], income: [] };
    const list = categoriesQ.data ?? [];
    const groups = list.filter((c) => c.parent === null);
    const childrenByParent = new Map<string, Category[]>();
    for (const c of list) {
      if (c.parent) {
        if (!childrenByParent.has(c.parent)) childrenByParent.set(c.parent, []);
        childrenByParent.get(c.parent)!.push(c);
      }
    }
    for (const g of groups) {
      map[g.type]?.push({ group: g, children: childrenByParent.get(g.id) ?? [] });
    }
    return map;
  }, [categoriesQ.data]);

  const hasData = (categoriesQ.data?.length ?? 0) > 0;
  const refresh = usePullRefresh(
    categoriesQ.isFetching && !categoriesQ.isLoading,
    () => categoriesQ.refetch(),
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Categorías" />
      {hasData ? (
        <Pressable
          onPress={() => {
            haptics.tap();
            setReordering((r) => !r);
          }}
          className="self-end py-1 active:opacity-60"
          accessibilityRole="button"
        >
          <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
            {reordering ? 'Listo' : 'Reordenar'}
          </Text>
        </Pressable>
      ) : null}

      <ScrollView
        contentContainerClassName="gap-4 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        {categoriesQ.isLoading ? (
          <LoadingState />
        ) : categoriesQ.isError ? (
          <ErrorState error={categoriesQ.error} onRetry={categoriesQ.refetch} />
        ) : !hasData ? (
          <>
            <EmptyState
              title="Sin categorías"
              hint="Crea grupos y, dentro, las subcategorías que uses."
            />
            <NewGroupButton type="expense" label="+ Nuevo grupo de gasto" />
            <NewGroupButton type="income" label="+ Nuevo grupo de ingreso" />
          </>
        ) : reordering ? (
          <>
            <Text className="text-text-muted px-1 text-xs">Arrastrá el asa ⠿ para reordenar.</Text>
            {SECTIONS.map(({ type, title }) =>
              trees[type].length === 0 ? null : (
                <View key={type} className="gap-3">
                  <Card title={`${title} · grupos`}>
                    <DragList
                      data={trees[type]}
                      keyExtractor={(t) => t.group.id}
                      itemHeight={44}
                      onReorder={(keys) => reorder.mutate(keys)}
                      renderItem={(t) => (
                        <Text className="text-text py-3 text-base font-semibold" numberOfLines={1}>
                          {t.group.icon ? `${t.group.icon}  ` : ''}
                          {t.group.name}
                        </Text>
                      )}
                    />
                  </Card>
                  {trees[type]
                    .filter((t) => t.children.length > 1)
                    .map((t) => (
                      <Card key={t.group.id} title={t.group.name}>
                        <DragList
                          data={t.children}
                          keyExtractor={(c) => c.id}
                          itemHeight={40}
                          onReorder={(keys) => reorder.mutate(keys)}
                          renderItem={(c) => (
                            <Text className="text-text py-2.5 text-base" numberOfLines={1}>
                              {c.icon ? `${c.icon}  ` : ''}
                              {c.name}
                            </Text>
                          )}
                        />
                      </Card>
                    ))}
                </View>
              ),
            )}
          </>
        ) : (
          <>
            {SECTIONS.map(({ type, title }) => (
              <Card
                key={type}
                title={title}
                action={
                  <Pressable
                    onPress={() => {
                      haptics.tap();
                      router.push(`/category/new?type=${type}`);
                    }}
                    accessibilityRole="button"
                    className="active:opacity-60"
                  >
                    <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                      + Grupo
                    </Text>
                  </Pressable>
                }
              >
                {trees[type].length === 0 ? (
                  <Text className="text-text-muted py-3 text-sm">Ningún grupo todavía.</Text>
                ) : (
                  <View>
                    {trees[type].map((t, i) => (
                      <View key={t.group.id}>
                        {i > 0 ? <View className="h-px bg-border/30" /> : null}

                        <Pressable
                          onPress={() => {
                            haptics.tap();
                            router.push(`/category/${t.group.id}`);
                          }}
                          className="flex-row items-center gap-3 py-2.5 active:opacity-60"
                          accessibilityRole="button"
                        >
                          <CategoryAvatar icon={t.group.icon} color={t.group.color} size={36} />
                          <Text
                            className="text-text flex-1 text-sm"
                            style={{ fontFamily: fonts.semibold }}
                            numberOfLines={1}
                          >
                            {t.group.name}
                          </Text>
                          <Icon name="chevron-right" size={16} color={colors.textMuted} />
                        </Pressable>

                        {t.children.length === 0 ? (
                          <Text className="text-text-muted pb-1 pl-[52px] text-xs">
                            Sin subcategorías.
                          </Text>
                        ) : (
                          t.children.map((c) => (
                            <Pressable
                              key={c.id}
                              onPress={() => {
                                haptics.tap();
                                router.push(`/category/${c.id}`);
                              }}
                              className="flex-row items-center gap-3 py-2 pl-[52px] active:opacity-60"
                              accessibilityRole="button"
                            >
                              <CategoryAvatar icon={c.icon} color={c.color} size={28} />
                              <Text className="text-text-muted flex-1 text-sm" numberOfLines={1}>
                                {c.name}
                              </Text>
                              <Icon name="chevron-right" size={14} color={colors.textMuted} />
                            </Pressable>
                          ))
                        )}

                        <Pressable
                          onPress={() => {
                            haptics.tap();
                            router.push(`/category/new?parent=${t.group.id}`);
                          }}
                          className="flex-row items-center gap-1 py-2 pl-[52px] active:opacity-60"
                          accessibilityRole="button"
                        >
                          <Icon name="plus" size={12} color={colors.primary} />
                          <Text
                            className="text-primary text-xs"
                            style={{ fontFamily: fonts.semibold }}
                          >
                            Subcategoría
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            ))}
            <DeletedCategories />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function DeletedCategories() {
  const colors = useColors();
  const deletedQ = useDeletedCategories();
  const restore = useRestoreCategory();
  const purge = useHardDeleteCategory();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const items = deletedQ.data ?? [];
  if (items.length === 0) return null;

  async function onRestore(id: string) {
    setBusyId(id);
    setPurgeError(null);
    try {
      await restore.mutateAsync(id);
    } finally {
      setBusyId(null);
    }
  }

  async function onPurge(id: string) {
    setBusyId(id);
    setPurgeError(null);
    try {
      await purge.mutateAsync(id);
      setConfirmId(null);
    } catch (err) {
      setPurgeError(errorMessage(err, 'No se pudo borrar del todo.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card title="Eliminadas">
      {purgeError ? <Text className="text-expense mb-2 text-xs">{purgeError}</Text> : null}
      {items.map((c, i) => (
        <View key={c.id} className={i > 0 ? 'border-t border-border/30' : ''}>
          <View className="flex-row items-center gap-3 py-2.5">
            <Text className="text-text-muted flex-1 text-sm" numberOfLines={1}>
              {c.name}
            </Text>
            {confirmId !== c.id ? (
              <>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    onRestore(c.id);
                  }}
                  disabled={busyId === c.id}
                  className="rounded-full bg-surface-2 px-2.5 py-1 active:opacity-60"
                  accessibilityRole="button"
                >
                  <Text className="text-primary text-xs" style={{ fontFamily: fonts.semibold }}>
                    {busyId === c.id ? '…' : 'Restaurar'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    setPurgeError(null);
                    setConfirmId(c.id);
                  }}
                  disabled={busyId === c.id}
                  className="rounded-full bg-surface-2 px-2.5 py-1 active:opacity-60"
                  accessibilityRole="button"
                  accessibilityLabel={`Borrar definitivamente ${c.name}`}
                >
                  <Icon name="trash" size={13} color={colors.textMuted} />
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-text-muted text-xs">¿Borrar del todo?</Text>
                <Pressable
                  onPress={() => setConfirmId(null)}
                  className="rounded-full bg-surface-2 px-2.5 py-1 active:opacity-60"
                  accessibilityRole="button"
                >
                  <Text className="text-text-muted text-xs">Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    onPurge(c.id);
                  }}
                  disabled={busyId === c.id}
                  className="bg-expense/15 rounded-full px-2.5 py-1 active:opacity-60"
                  accessibilityRole="button"
                >
                  <Text className="text-expense text-xs" style={{ fontFamily: fonts.semibold }}>
                    {busyId === c.id ? '…' : 'Borrar'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      ))}
    </Card>
  );
}

function NewGroupButton({ type, label }: { type: CategoryType; label: string }) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        router.push(`/category/new?type=${type}`);
      }}
      className="self-center rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
      accessibilityRole="button"
    >
      <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
        {label}
      </Text>
    </Pressable>
  );
}
