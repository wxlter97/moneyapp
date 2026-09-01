import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import {
  useAccounts,
  useBudgetReport,
  useDashboardSummary,
  useNetWorth,
} from '@/api/queries';
import { AccountRow } from '@/components/AccountRow';
import { AddTransactionFab } from '@/components/AddTransactionFab';
import { BudgetProgressRow } from '@/components/BudgetProgressRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SummaryTriple } from '@/components/SummaryTriple';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { toNumber } from '@/lib/money';

export default function DashboardScreen() {
  const netWorth = useNetWorth();
  const summary = useDashboardSummary();
  const accounts = useAccounts();
  const budget = useBudgetReport();

  const currency = accounts.data?.[0]?.currency ?? 'USD';
  const loading =
    netWorth.isLoading || summary.isLoading || accounts.isLoading || budget.isLoading;
  const anyError = netWorth.isError || summary.isError;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerClassName="px-4 pb-24 self-center w-full max-w-[560px]"
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScreenHeader />

        {loading ? (
          <LoadingState />
        ) : anyError ? (
          <ErrorState
            error={netWorth.error ?? summary.error}
            onRetry={() => {
              netWorth.refetch();
              summary.refetch();
            }}
          />
        ) : (
          <View className="gap-4">
            {/* Patrimonio neto */}
            <Card title="Patrimonio neto">
              <Money
                value={netWorth.data?.net}
                currency={currency}
                signed
                className="text-3xl font-bold"
              />
            </Card>

            {/* Mes actual */}
            {summary.data ? (
              <View className="gap-2">
                <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide">
                  Este mes
                </Text>
                <SummaryTriple
                  income={toNumber(summary.data.month.income)}
                  expenses={toNumber(summary.data.month.expenses)}
                  net={toNumber(summary.data.month.net)}
                  currency={currency}
                />
                {summary.data.pending_email_imports > 0 ? (
                  <Text className="text-warning text-xs">
                    {summary.data.pending_email_imports} importación(es) por correo pendientes de
                    revisar.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Cuentas */}
            <Card
              title="Cuentas"
              action={
                <Link href="/accounts" asChild>
                  <Text className="text-primary text-xs">Ver todo</Text>
                </Link>
              }
            >
              {(accounts.data?.length ?? 0) === 0 ? (
                <EmptyState title="Sin cuentas" />
              ) : (
                accounts.data!.map((a, i) => (
                  <View key={a.id}>
                    {i > 0 ? <View className="h-px bg-border/60" /> : null}
                    <AccountRow account={a} />
                  </View>
                ))
              )}
            </Card>

            {/* Presupuestos */}
            <Card
              title="Presupuestos"
              action={
                <Link href="/budgets" asChild>
                  <Text className="text-primary text-xs">Ver todo</Text>
                </Link>
              }
            >
              {budget.isError ? (
                <ErrorState error={budget.error} onRetry={budget.refetch} />
              ) : (budget.data?.rows.length ?? 0) === 0 ? (
                <EmptyState title="Sin presupuestos este mes" />
              ) : (
                budget.data!.rows.slice(0, 5).map((row, i) => (
                  <View key={row.category}>
                    {i > 0 ? <View className="h-px bg-border/60" /> : null}
                    <BudgetProgressRow row={row} currency={currency} />
                  </View>
                ))
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      <AddTransactionFab />
    </View>
  );
}
