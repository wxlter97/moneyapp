import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { BudgetRow, ISODate } from '@/api/types';
import { BudgetMeter } from '@/components/ui/BudgetMeter';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { budgetState } from '@/lib/budgetState';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface BudgetProgressRowProps {
  row: BudgetRow;
  currency?: string;
  /** Rango del período del reporte (`period_start`/`period_end`): si se
   * pasan, tocar la fila lleva a los movimientos de esa categoría en ese
   * rango (con opción de ver todo el histórico). */
  from?: ISODate;
  to?: ISODate;
}

export function BudgetProgressRow({
  row,
  currency = 'USD',
  from,
  to,
}: BudgetProgressRowProps) {
  const colors = useColors();
  const budgeted = toNumber(row.budgeted);
  const spent = toNumber(row.spent);
  const provision = toNumber(row.provision);
  const { state, noBudget } = budgetState(spent, budgeted);
  const moneyTone = state === 'over' ? 'expense' : state === 'warning' ? 'warning' : 'muted';

  const content = (
    <View className="gap-1.5 py-3">
      {/* `flex-wrap`, sin `numberOfLines`: un nombre de categoría largo se
          envuelve a una segunda línea en vez de recortarse -- rediseño
          mobile de la Fase 3, no una compresión del layout de desktop. */}
      <View className="flex-row flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <Text className="text-text min-w-0 flex-1 text-sm" style={{ fontFamily: fonts.semibold }}>
          {row.category_name ?? 'Sin categoría'}
        </Text>
        <View className="flex-row items-center gap-1">
          {/* El color nunca es la única señal de sobregiro (WCAG 1.4.1): el
              ícono se ve igual para alguien con daltonismo o en una captura
              en blanco y negro. */}
          {state !== 'ok' ? (
            <View testID="budget-row-alert">
              <Icon
                name="alert"
                size={12}
                color={state === 'over' ? colors.expense : colors.warning}
              />
            </View>
          ) : null}
          <Text className="text-text-muted text-xs">
            <Money value={spent} currency={currency} tone={moneyTone} /> /{' '}
            <Money value={budgeted} currency={currency} tone="muted" />
            {noBudget ? ' (sin presupuesto)' : null}
          </Text>
        </View>
      </View>

      <BudgetMeter spent={spent} budgeted={budgeted} currency={currency} size="sm" />

      {provision > 0 ? (
        <Text className="text-income text-[11px]">
          + <Money value={provision} currency={currency} tone="income" /> de provisión acumulada
        </Text>
      ) : null}
    </View>
  );

  if (!from || !to) return content;

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        router.push(`/category-transactions?category=${row.category}&from=${from}&to=${to}`);
      }}
      accessibilityRole="button"
      className="active:opacity-60"
    >
      {content}
    </Pressable>
  );
}
