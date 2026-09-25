import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { haptics } from '@/lib/haptics';
import type { CategoryBreakdownRow } from '@/lib/transactions';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface FilteredBreakdownProps {
  /** Cuántos movimientos cumplen el filtro (transferencias incluidas). */
  count: number | undefined;
  rows: CategoryBreakdownRow[];
  currency: string;
  categories: Map<string, Category>;
  /** Tocar una categoría (p. ej. abrir sus movimientos). */
  onPressCategory?: (categoryId: string) => void;
}

/**
 * Debajo de Ingresos/Gastos/Neto cuando hay búsqueda o filtros: cuántos
 * movimientos cumplen el filtro, y al tocar, de qué categorías sale ese
 * total (con su peso sobre el total). Los totales de arriba ya siguen al
 * filtro; esto responde "¿y de dónde sale?".
 */
export function FilteredBreakdown({
  count,
  rows,
  currency,
  categories,
  onPressCategory,
}: FilteredBreakdownProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const max = Math.max(1, ...rows.map((r) => r.income + r.expenses));

  return (
    <View className="rounded-2xl border border-border/60 bg-surface/95">
      <Pressable
        onPress={() => {
          haptics.tap();
          setOpen((v) => !v);
        }}
        disabled={rows.length === 0}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center gap-2 px-4 py-3 active:opacity-70"
      >
        <Text className="text-text flex-1 text-sm" style={{ fontFamily: fonts.semibold }}>
          {count == null ? '…' : `${count} ${count === 1 ? 'movimiento' : 'movimientos'}`}
        </Text>
        {rows.length > 0 ? (
          <>
            <Text className="text-text-muted text-xs">Por categoría</Text>
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
          </>
        ) : null}
      </Pressable>
      {open ? (
        <View className="gap-3 px-4 pb-4">
          {rows.map((r) => {
            const cat = r.category ? categories.get(r.category) : undefined;
            const isIncome = r.income > r.expenses;
            const total = r.income + r.expenses;
            return (
              <Pressable
                key={r.category ?? 'none'}
                onPress={r.category && onPressCategory ? () => onPressCategory(r.category!) : undefined}
                disabled={!r.category || !onPressCategory}
                accessibilityRole={r.category && onPressCategory ? 'button' : undefined}
                className="flex-row items-center gap-3 active:opacity-70"
              >
                <CategoryAvatar icon={cat?.icon} color={cat?.color} size={32} />
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-text flex-1 text-sm" numberOfLines={1}>
                      {cat?.name ?? 'Sin categoría'}
                      <Text className="text-text-muted text-xs"> · {r.count}</Text>
                    </Text>
                    <Money
                      value={isIncome ? r.income : -r.expenses}
                      currency={currency}
                      hideCurrency
                      parens
                      tone={isIncome ? 'income' : 'expense'}
                      className="text-sm font-semibold"
                    />
                  </View>
                  <View className="h-1 overflow-hidden rounded-full bg-surface-2">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (total / max) * 100)}%`,
                        backgroundColor: isIncome ? colors.income : colors.expense,
                      }}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
