import { Text, View } from 'react-native';

import type { BudgetRow } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { toNumber } from '@/lib/money';
import { fonts } from '@/theme/typography';

interface BudgetProgressRowProps {
  row: BudgetRow;
  currency?: string;
  /** Muestra la línea de provisión acumulada (pantalla de Presupuestos). */
  showProvision?: boolean;
}

export function BudgetProgressRow({
  row,
  currency = 'USD',
  showProvision = false,
}: BudgetProgressRowProps) {
  const budgeted = toNumber(row.budgeted);
  const spent = toNumber(row.spent);
  const provision = toNumber(row.provision);
  const over = budgeted > 0 && spent > budgeted;
  const progress = budgeted > 0 ? spent / budgeted : spent > 0 ? 1 : 0;

  return (
    <View className="gap-1.5 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {row.category_name ?? 'Sin categoría'}
        </Text>
        <Text className="text-text-muted text-xs">
          <Money value={spent} currency={currency} tone={over ? 'expense' : 'muted'} /> /{' '}
          <Money value={budgeted} currency={currency} tone="muted" />
        </Text>
      </View>

      <ProgressBar progress={progress} over={over} />

      {showProvision && provision > 0 ? (
        <Text className="text-income text-[11px]">
          + <Money value={provision} currency={currency} tone="income" /> de provisión acumulada
        </Text>
      ) : null}
    </View>
  );
}
