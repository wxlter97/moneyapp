import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useCategories } from '@/api/queries';
import type { Category, CategoryType } from '@/api/types';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

const SECTIONS: { type: CategoryType; title: string }[] = [
  { type: 'expense', title: 'Gastos' },
  { type: 'income', title: 'Ingresos' },
];

export default function CategoriesScreen() {
  const categoriesQ = useCategories();

  const byType = useMemo(() => {
    const map: Record<CategoryType, Category[]> = { expense: [], income: [] };
    for (const c of categoriesQ.data ?? []) map[c.type]?.push(c);
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
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
              hint="Crea las que necesites para clasificar tus movimientos."
            />
            <AddButton type="expense" label="+ Nueva categoría de gasto" />
            <AddButton type="income" label="+ Nueva categoría de ingreso" />
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
                  <Text className="text-primary text-sm font-semibold">+ Nueva</Text>
                </Pressable>
              }
            >
              {byType[type].length === 0 ? (
                <Text className="text-text-muted py-3 text-sm">Ninguna todavía.</Text>
              ) : (
                byType[type].map((c, i) => (
                  <View key={c.id}>
                    {i > 0 ? <View className="h-px bg-border/60" /> : null}
                    <Pressable
                      onPress={() => router.push(`/category/${c.id}`)}
                      className="flex-row items-center gap-3 py-3 active:opacity-60"
                      accessibilityRole="button"
                    >
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: c.color || '#334155' }}
                      >
                        <Text className="text-sm">{c.icon || '•'}</Text>
                      </View>
                      <Text className="text-text flex-1 text-base" numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text className="text-text-muted">›</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function AddButton({ type, label }: { type: CategoryType; label: string }) {
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
