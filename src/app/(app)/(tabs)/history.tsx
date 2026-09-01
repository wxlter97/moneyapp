import { useMemo, useState } from 'react';
import { SectionList, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useTransactions } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SummaryTriple } from '@/components/SummaryTriple';
import { TransactionRow } from '@/components/TransactionRow';
import { AddTransactionFab } from '@/components/AddTransactionFab';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { currentYearMonth, formatDayHeader, monthRange } from '@/lib/date';
import { groupByDay, summarizeByType } from '@/lib/transactions';

export default function HistoryScreen() {
  const [month, setMonth] = useState(currentYearMonth);
  const range = useMemo(() => monthRange(month), [month]);

  const txQuery = useTransactions({ date_after: range.from, date_before: range.to });
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();

  const items = txQuery.data ?? [];
  const totals = useMemo(() => summarizeByType(items), [items]);
  const sections = useMemo(() => groupByDay(items), [items]);
  const currency = items[0]?.currency ?? 'USD';

  return (
    <Screen noPadding>
      <View className="px-4">
        <ScreenHeader />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        contentContainerClassName="px-4 pb-24"
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View className="h-px bg-border/60" />}
        ListHeaderComponent={
          <View className="gap-3 pb-2 pt-1">
            <MonthSwitcher value={month} onChange={setMonth} />
            <SummaryTriple
              income={totals.income}
              expenses={totals.expenses}
              currency={currency}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="bg-bg pb-1 pt-4 text-text-muted text-xs font-semibold uppercase tracking-wide">
            {formatDayHeader(section.date)}
          </Text>
        )}
        renderItem={({ item }) => (
          <TransactionRow
            txn={item}
            category={item.category ? categories.get(item.category) : undefined}
            wallet={wallets.get(item.wallet)}
            toWallet={item.to_wallet ? wallets.get(item.to_wallet) : undefined}
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
