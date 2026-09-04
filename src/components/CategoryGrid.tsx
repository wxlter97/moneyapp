import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Category, CategoryType } from '@/api/types';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { FadeInView } from './ui/FadeInView';
import { Icon } from './ui/Icon';

interface GroupTree {
  group: Category;
  children: Category[];
}

function buildTrees(categories: Category[], type: CategoryType): GroupTree[] {
  const list = categories.filter((c) => c.type === type);
  const groups = list.filter((c) => c.parent === null);
  const byParent = new Map<string, Category[]>();
  for (const c of list) {
    if (c.parent) {
      if (!byParent.has(c.parent)) byParent.set(c.parent, []);
      byParent.get(c.parent)!.push(c);
    }
  }
  return groups.map((group) => ({ group, children: byParent.get(group.id) ?? [] }));
}

function Tile({
  category,
  selected,
  onPress,
}: {
  category: Category;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="w-1/4 items-center gap-1 px-1 py-2 active:opacity-60"
    >
      <View
        className={`h-14 w-14 items-center justify-center rounded-full ${
          selected ? 'border-2 border-primary' : ''
        }`}
        style={{ backgroundColor: category.color || '#334155' }}
      >
        {category.icon ? (
          <Text className="text-xl">{category.icon}</Text>
        ) : (
          <Icon name="tag" size={20} color="#FFFFFF" />
        )}
      </View>
      <Text
        className={`text-center text-[11px] leading-tight ${
          selected ? 'text-primary font-semibold' : 'text-text-muted'
        }`}
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}

/**
 * Rejilla de categorías estilo Buddy: por cada grupo, un encabezado y una
 * cuadrícula de 4 columnas con el icono y el nombre. Sirve para elegir rápido
 * (modo `onSelect`) o para entrar a editar (modo `onEditCategory`).
 */
export function CategoryGrid({
  categories,
  type,
  selectedId = null,
  onSelect,
  onEditCategory,
  onAddSub,
}: {
  categories: Category[];
  type: CategoryType;
  selectedId?: string | null;
  /** Modo selección: se llama con el id de la subcategoría elegida. */
  onSelect?: (id: string) => void;
  /** Modo gestión: se llama con la categoría (grupo o hija) para editarla. */
  onEditCategory?: (category: Category) => void;
  /** Modo gestión: muestra "+ Subcategoría" bajo cada grupo. */
  onAddSub?: (groupId: string) => void;
}) {
  const trees = useMemo(() => buildTrees(categories, type), [categories, type]);

  if (trees.length === 0) {
    return (
      <Text className="text-text-muted px-1 py-3 text-sm">
        Sin categorías de {type === 'income' ? 'ingreso' : 'gasto'}.
      </Text>
    );
  }

  return (
    <View className="gap-3">
      {trees.map(({ group, children }) => {
        // En modo selección un grupo sin hijas es elegible él mismo.
        const selfCell = onSelect && children.length === 0;
        const cells = selfCell ? [group] : children;
        return (
          <View key={group.id}>
            {selfCell ? null : (
              <Pressable
                onPress={() => onEditCategory?.(group)}
                disabled={!onEditCategory}
                className="flex-row items-center gap-2 px-1 pb-1 active:opacity-60"
              >
                {group.icon ? <Text className="text-xs">{group.icon}</Text> : null}
                <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide">
                  {group.name}
                </Text>
              </Pressable>
            )}
            {cells.length === 0 ? (
              <Text className="text-text-muted px-1 pb-1 text-xs">Sin subcategorías.</Text>
            ) : (
              <View className="flex-row flex-wrap">
                {cells.map((c) => (
                  <Tile
                    key={c.id}
                    category={c}
                    selected={selectedId === c.id}
                    onPress={() => (onSelect ? onSelect(c.id) : onEditCategory?.(c))}
                  />
                ))}
              </View>
            )}
            {onAddSub ? (
              <Pressable
                onPress={() => onAddSub(group.id)}
                className="px-1 py-1 active:opacity-60"
                accessibilityRole="button"
              >
                <Text className="text-primary text-xs font-semibold">+ Subcategoría</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Campo de formulario "Categoría": fila compacta que despliega la rejilla para
 * elegir rápido (sin Modal). Reemplaza al PickerRow en el alta de transacción.
 */
export function CategoryPickerField({
  categories,
  type,
  value,
  open,
  onToggle,
  onChange,
  loading = false,
  error,
}: {
  categories: Category[];
  type: CategoryType;
  value: string | null;
  open: boolean;
  onToggle: () => void;
  onChange: (id: string) => void;
  loading?: boolean;
  error?: string;
}) {
  const selected = categories.find((c) => c.id === value) ?? null;
  const colors = useColors();

  return (
    <View>
      <Pressable
        onPress={() => {
          haptics.tap();
          onToggle();
        }}
        accessibilityRole="button"
        className={`h-12 flex-row items-center justify-between border-b px-1 ${
          error ? 'border-expense' : 'border-border/60'
        } active:opacity-70`}
      >
        <Text className="text-text-muted text-sm">Categoría</Text>
        <View className="flex-row items-center gap-2">
          {selected ? (
            <View
              className="h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: selected.color || '#334155' }}
            >
              {selected.icon ? (
                <Text className="text-xs">{selected.icon}</Text>
              ) : (
                <Icon name="tag" size={12} color="#FFFFFF" />
              )}
            </View>
          ) : null}
          <Text className={selected ? 'text-text' : 'text-text-muted'} numberOfLines={1}>
            {loading ? 'Cargando…' : (selected?.name ?? 'Elegir')}
          </Text>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      {error ? <Text className="text-expense mt-1 text-xs">{error}</Text> : null}

      {open ? (
        <FadeInView>
          <View className="mt-2 rounded-xl border border-border bg-surface p-3">
            <ScrollView className="max-h-80" keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <CategoryGrid
                categories={categories}
                type={type}
                selectedId={value}
                onSelect={onChange}
              />
            </ScrollView>
          </View>
        </FadeInView>
      ) : null}
    </View>
  );
}
