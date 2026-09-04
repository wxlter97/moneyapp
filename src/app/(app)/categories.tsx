import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  useCategories,
  useDeletedCategories,
  useReorderCategories,
  useRestoreCategory,
} from '@/api/queries';
import type { Category, CategoryType } from '@/api/types';
import { CategoryGrid } from '@/components/CategoryGrid';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { DragList } from '@/components/ui/DragList';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

const SECTIONS: { type: CategoryType; title: string }[] = [
  { type: 'expense', title: 'Gastos' },
  { type: 'income', title: 'Ingresos' },
];

interface GroupTree {
  group: Category;
  children: Category[];
}

export default function CategoriesScreen() {
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

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Categorías" />
      {hasData ? (
        <Pressable
          onPress={() => setReordering((r) => !r)}
          className="self-end py-1 active:opacity-60"
          accessibilityRole="button"
        >
          <Text className="text-primary text-sm font-semibold">
            {reordering ? 'Listo' : 'Reordenar'}
          </Text>
        </Pressable>
      ) : null}

      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
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
                    onPress={() => router.push(`/category/new?type=${type}`)}
                    accessibilityRole="button"
                    className="active:opacity-60"
                  >
                    <Text className="text-primary text-sm font-semibold">+ Grupo</Text>
                  </Pressable>
                }
              >
                {trees[type].length === 0 ? (
                  <Text className="text-text-muted py-3 text-sm">Ningún grupo todavía.</Text>
                ) : (
                  <CategoryGrid
                    categories={categoriesQ.data ?? []}
                    type={type}
                    onEditCategory={(c) => router.push(`/category/${c.id}`)}
                    onAddSub={(groupId) => router.push(`/category/new?parent=${groupId}`)}
                  />
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
  const deletedQ = useDeletedCategories();
  const restore = useRestoreCategory();
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = deletedQ.data ?? [];
  if (items.length === 0) return null;

  async function onRestore(id: string) {
    setBusyId(id);
    try {
      await restore.mutateAsync(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card title="Eliminadas">
      {items.map((c, i) => (
        <View
          key={c.id}
          className={`flex-row items-center gap-3 py-2.5 ${
            i > 0 ? 'border-t border-border/60' : ''
          }`}
        >
          <Text className="text-text-muted flex-1 text-sm" numberOfLines={1}>
            {c.name}
          </Text>
          <Pressable
            onPress={() => onRestore(c.id)}
            disabled={busyId === c.id}
            className="rounded-lg border border-border px-2.5 py-1 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-primary text-xs font-semibold">
              {busyId === c.id ? '…' : 'Restaurar'}
            </Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

function NewGroupButton({ type, label }: { type: CategoryType; label: string }) {
  return (
    <Pressable
      onPress={() => router.push(`/category/new?type=${type}`)}
      className="self-center rounded-lg border border-border px-3 py-1.5 active:opacity-70"
      accessibilityRole="button"
    >
      <Text className="text-primary text-sm font-semibold">{label}</Text>
    </Pressable>
  );
}
