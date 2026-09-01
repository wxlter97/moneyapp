import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useBudgetReport } from '@/api/queries';
import { BudgetProgressRow } from '@/components/BudgetProgressRow';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { currentYearMonth } from '@/lib/date';

export default function BudgetsScreen() {
  const [month, setMonth] = useState(currentYearMonth);
  const budget = useBudgetReport(month);
  const currency = 'USD';

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-24 self-center w-full max-w-[560px] gap-4">
        <ScreenHeader />
        <MonthSwitcher value={month} onChange={setMonth} />

        {budget.isLoading ? (
          <LoadingState />
        ) : budget.isError || !budget.data ? (
          <ErrorState error={budget.error} onRetry={budget.refetch} />
        ) : (
          <>
            <Card title="Total del mes">
              <View className="flex-row justify-between">
                <Labeled label="Presupuestado">
                  <Money value={budget.data.totals.budgeted} currency={currency} />
                </Labeled>
                <Labeled label="Gastado">
                  <Money value={budget.data.totals.spent} currency={currency} tone="expense" />
                </Labeled>
                <Labeled label="Disponible">
                  <Money value={budget.data.totals.remaining} currency={currency} signed />
                </Labeled>
              </View>
            </Card>

            <Card title="Por categoría">
              {budget.data.rows.length === 0 ? (
                <EmptyState
                  title="Sin presupuestos"
                  hint="Define montos por categoría para este mes."
                />
              ) : (
                budget.data.rows.map((row, i) => (
                  <View key={row.category}>
                    {i > 0 ? <View className="h-px bg-border/60" /> : null}
                    <BudgetProgressRow row={row} currency={currency} showProvision />
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="text-text-muted text-[11px] uppercase tracking-wide">{label}</Text>
      {children}
    </View>
  );
}
