import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useTransactions } from '@/api/queries';
import { useAccountMap, useCategoryMap } from '@/api/queries/lookups';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SummaryTriple } from '@/components/SummaryTriple';
import { TransactionRow } from '@/components/TransactionRow';
import { AddTransactionFab } from '@/components/AddTransactionFab';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { currentYearMonth, monthRange } from '@/lib/date';
import { summarizeByType } from '@/lib/transactions';

export default function HistoryScreen() {
  const [month, setMonth] = useState(currentYearMonth);
  const range = useMemo(() => monthRange(month), [month]);

  const txQuery = useTransactions({ date_after: range.from, date_before: range.to });
  const { map: categories } = useCategoryMap();
  const { map: accounts } = useAccountMap();

  const totals = useMemo(
    () => summarizeByType(txQuery.data ?? [], categories),
    [txQuery.data, categories],
  );

  const currency = txQuery.data?.[0]?.currency ?? 'USD';

  return (
    <Screen noPadding>
      <View className="px-4">
        <ScreenHeader />
      </View>

      <FlatList
        data={txQuery.data ?? []}
        keyExtractor={(t) => t.id}
        contentContainerClassName="px-4 pb-24"
        ItemSeparatorComponent={() => <View className="h-px bg-border/60" />}
        ListHeaderComponent={
          <View className="gap-3 pb-2 pt-1">
            <MonthSwitcher value={month} onChange={setMonth} />
            <SummaryTriple
              income={totals.income}
              expenses={totals.expenses}
              currency={currency}
            />
            <Text className="pt-2 text-text-muted text-xs font-semibold uppercase tracking-wide">
              Transacciones
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TransactionRow
            txn={item}
            category={categories.get(item.category)}
            account={accounts.get(item.account)}
            onPress={() => router.push(`/transaction/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          txQuery.isLoading ? (
            <LoadingState />
          ) : txQuery.isError ? (
            <ErrorState error={txQuery.error} onRetry={txQuery.refetch} />
          ) : (
            <EmptyState title="Sin movimientos este mes" hint="Agrega uno con el botón +." />
          )
        }
      />

      <AddTransactionFab />
    </Screen>
  );
}
