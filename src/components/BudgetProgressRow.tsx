import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { BudgetRow, ISODate } from '@/api/types';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ProgressBar, type ProgressState } from '@/components/ui/ProgressBar';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/** A partir de qué fracción del presupuesto se avisa "cerca del límite". */
const WARNING_THRESHOLD = 0.8;

interface BudgetProgressRowProps {
  row: BudgetRow;
  currency?: string;
  /** Muestra la línea de provisión acumulada (pantalla de Presupuestos). */
  showProvision?: boolean;
  /** Rango del período del reporte (`period_start`/`period_end`): si se
   * pasan, tocar la fila lleva a los movimientos de esa categoría en ese
   * rango (con opción de ver todo el histórico). */
  from?: ISODate;
  to?: ISODate;
}

export function BudgetProgressRow({
  row,
  currency = 'USD',
  showProvision = false,
  from,
  to,
}: BudgetProgressRowProps) {
  const colors = useColors();
  const budgeted = toNumber(row.budgeted);
  const spent = toNumber(row.spent);
  const provision = toNumber(row.provision);
  // Gastar sin tener nada presupuestado (ej. "Miscelánea") es tan sobregiro
  // como pasarse de un presupuesto que sí existe -- antes quedaba afuera
  // porque `budgeted > 0` lo excluía del todo.
  const noBudget = budgeted <= 0 && spent > 0;
  // `>=` (no `>`): llegar exacto al 100% ya es "sin margen", no "todo bien".
  const over = noBudget || (budgeted > 0 && spent >= budgeted);
  const ratio = budgeted > 0 ? spent / budgeted : spent > 0 ? 1 : 0;
  const warning = !over && ratio >= WARNING_THRESHOLD;
  const state: ProgressState = over ? 'over' : warning ? 'warning' : 'ok';
  const moneyTone = over ? 'expense' : warning ? 'warning' : 'muted';

  const content = (
    <View className="gap-1.5 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
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

      <ProgressBar progress={over ? 1 : ratio} state={state} />

      {showProvision && provision > 0 ? (
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
