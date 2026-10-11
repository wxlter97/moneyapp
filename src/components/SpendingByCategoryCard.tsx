import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

import { useTransactionBreakdown } from '@/api/queries';
import { useCategoryMap } from '@/api/queries/lookups';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { PeriodSwitcher } from '@/components/PeriodSwitcher';
import { todayISO } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { currencySymbol, formatNumber } from '@/lib/money';
import { periodEnd, periodStart } from '@/lib/periods';
import { buildSpendingSlices, type SpendingSlice } from '@/lib/spendingSlices';
import { useWorkspaceStore } from '@/store/workspace';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

// Colores bien distintos entre sí (no los de cada categoría, que pueden ser
// casi iguales): el gráfico y la lista comparten el de su posición.
const SLICE_COLORS = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#ef4444', '#eab308', '#14b8a6'];
const SIZE = 210;
const STROKE = 26;
const STROKE_SELECTED = 34;
const GAP = 2; // px de separación entre porciones

/**
 * Distribución de los gastos por categoría del período elegido (el mismo
 * tipo de período que el Presupuesto del workspace): dona + top de categorías.
 * Tocar una porción o una fila la resalta y muestra su detalle en el centro;
 * tocar la seleccionada abre sus movimientos.
 */
export function SpendingByCategoryCard({ currency }: { currency: string }) {
  const colors = useColors();
  const ws = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const period = ws?.budget_period ?? 'monthly';
  const weekStart = ws?.week_start_day ?? 0;
  const [override, setOverride] = useState<string | null>(null);
  const start = override ?? periodStart(todayISO(), period, weekStart);
  const end = periodEnd(start, period);
  const [selected, setSelected] = useState<SpendingSlice['id'] | undefined>(undefined);

  const filters = useMemo(() => ({ date_after: start, date_before: end }), [start, end]);
  const query = useTransactionBreakdown(filters);
  const { map: categories } = useCategoryMap();
  const { total, slices } = useMemo(
    () => buildSpendingSlices(query.data, currency),
    [query.data, currency],
  );

  const colorOf = (s: SpendingSlice, i: number) =>
    s.id === 'others' ? colors.textMuted : SLICE_COLORS[i % SLICE_COLORS.length];
  const nameOf = (s: SpendingSlice) =>
    s.id === 'others' ? 'Otras' : s.id ? (categories.get(s.id)?.name ?? 'Categoría') : 'Sin categoría';

  const active = slices.find((s) => s.id === selected);

  function select(s: SpendingSlice) {
    haptics.selection();
    setSelected((cur) => (cur === s.id ? undefined : s.id));
  }

  function openCategory(s: SpendingSlice) {
    if (!s.id || s.id === 'others') return;
    haptics.tap();
    router.push(`/category-transactions?category=${s.id}&from=${start}&to=${end}`);
  }

  const r = (SIZE - STROKE_SELECTED) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <Card title="Gastos por categoría">
      <View className="gap-4">
        <PeriodSwitcher
          value={start}
          period={period}
          weekStart={weekStart}
          onChange={(v) => {
            setOverride(v);
            setSelected(undefined);
          }}
          clampToCurrent
        />

        {query.isLoading ? (
          <Skeleton height={190} radius={16} />
        ) : slices.length === 0 ? (
          <Text className="text-text-muted py-6 text-center text-sm">Sin gastos en este período.</Text>
        ) : (
          <>
            <View className="items-center">
              <View style={{ width: SIZE, height: SIZE }} className="items-center justify-center">
                <Svg width={SIZE} height={SIZE}>
                    <Circle
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={r}
                      stroke={colors.surface2}
                      strokeWidth={STROKE}
                      fill="none"
                    />
                    {slices.map((s, i) => {
                      const len = Math.max(s.share * circumference - (slices.length > 1 ? GAP : 0), 1);
                      const el = (
                        <Circle
                          key={String(s.id)}
                          cx={SIZE / 2}
                          cy={SIZE / 2}
                          r={r}
                          stroke={colorOf(s, i)}
                          strokeWidth={s.id === selected ? STROKE_SELECTED : STROKE}
                          strokeOpacity={selected === undefined || s.id === selected ? 1 : 0.35}
                          strokeDasharray={`${len} ${circumference - len}`}
                          strokeDashoffset={circumference / 4 - offset}
                          fill="none"
                          onPress={() => select(s)}
                        />
                      );
                      offset += s.share * circumference;
                      return el;
                    })}
                </Svg>
                <View
                  pointerEvents="none"
                  className="absolute items-center justify-center px-10"
                  style={{ width: SIZE, height: SIZE }}
                >
                  <Text className="text-text-muted text-xs" numberOfLines={1}>
                    {active ? nameOf(active) : 'Total gastado'}
                  </Text>
                  <Text
                    className="text-expense text-2xl font-bold"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {currencySymbol(currency)}
                    {formatNumber(active ? active.amount : total, { compact: true })}
                  </Text>
                  <Text className="text-text-muted text-xs">
                    {active ? `${Math.round(active.share * 100)}%` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-1">
              {slices.map((s, i) => {
                const cat = s.id && s.id !== 'others' ? categories.get(s.id) : undefined;
                const isSel = s.id === selected;
                return (
                  <Pressable
                    key={String(s.id)}
                    onPress={() => (isSel ? openCategory(s) : select(s))}
                    accessibilityRole="button"
                    accessibilityLabel={`${nameOf(s)}, ${Math.round(s.share * 100)}%`}
                    accessibilityState={{ selected: isSel }}
                    className={`flex-row items-center gap-3 rounded-xl px-2 py-2 ${
                      isSel ? 'bg-surface-2' : 'active:bg-surface-2'
                    }`}
                  >
                    <View
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: colorOf(s, i) }}
                    />
                    {s.id !== 'others' ? (
                      <CategoryAvatar icon={cat?.icon} color={cat?.color} size={28} />
                    ) : null}
                    <View className="flex-1">
                      <Text
                        className="text-text text-sm"
                        style={{ fontFamily: isSel ? fonts.semibold : undefined }}
                        numberOfLines={1}
                      >
                        {nameOf(s)}
                      </Text>
                      {isSel && s.id && s.id !== 'others' ? (
                        <Text className="text-primary text-xs">Ver movimientos</Text>
                      ) : null}
                    </View>
                    <View className="items-end">
                      <Money value={s.amount} currency={currency} className="text-sm" />
                      <Text className="text-text-muted text-xs">{Math.round(s.share * 100)}%</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>
    </Card>
  );
}
