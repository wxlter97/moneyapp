import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useCategories, useDeletedCategories, useRestoreCategory } from '@/api/queries';
import type { Category, CategoryType } from '@/api/types';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
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

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Categorías" />
      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        {categoriesQ.isLoading ? (
          <LoadingState />
        ) : categoriesQ.isError ? (
          <ErrorState error={categoriesQ.error} onRetry={categoriesQ.refetch} />
        ) : (categoriesQ.data?.length ?? 0) === 0 ? (
          <>
            <EmptyState
              title="Sin categorías"
              hint="Crea grupos y, dentro, las subcategorías que uses."
            />
            <NewGroupButton type="expense" label="+ Nuevo grupo de gasto" />
            <NewGroupButton type="income" label="+ Nuevo grupo de ingreso" />
          </>
        ) : (
          SECTIONS.map(({ type, title }) => (
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
                trees[type].map((t, i) => (
                  <View key={t.group.id} className={i > 0 ? 'mt-2 border-t border-border/60 pt-2' : ''}>
                    <CategoryLine category={t.group} bold />
                    {t.children.map((c) => (
                      <View key={c.id} className="pl-4">
                        <CategoryLine category={c} />
                      </View>
                    ))}
                    <Pressable
                      onPress={() => router.push(`/category/new?parent=${t.group.id}`)}
                      className="py-2 pl-4 active:opacity-60"
                      accessibilityRole="button"
                    >
                      <Text className="text-primary text-xs font-semibold">+ Subcategoría</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
          ))
        )}

        <DeletedCategories />
      </ScrollView>
    </Screen>
  );
}

function CategoryLine({ category, bold = false }: { category: Category; bold?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(`/category/${category.id}`)}
      className="flex-row items-center gap-3 py-2.5 active:opacity-60"
      accessibilityRole="button"
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: category.color || '#334155' }}
      >
        <Text className="text-sm">{category.icon || (bold ? '📁' : '•')}</Text>
      </View>
      <Text
        className={`flex-1 text-base ${bold ? 'text-text font-semibold' : 'text-text'}`}
        numberOfLines={1}
      >
        {category.name}
      </Text>
      <Text className="text-text-muted">›</Text>
    </Pressable>
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
