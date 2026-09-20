import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useInfiniteTransactions, useTags, useTransactionTotals } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { TransactionRow } from '@/components/TransactionRow';
import { LoadMoreFooter } from '@/components/ui/LoadMoreFooter';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { SummaryTriple } from '@/components/SummaryTriple';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDayHeader } from '@/lib/date';
import { flattenPages, usePagedScroll } from '@/lib/pagedList';
import { groupByDay, totalsForCurrency, useSwipeDeleteTransactions } from '@/lib/transactions';
import { useWorkspaceStore } from '@/store/workspace';

/** Todos los movimientos de una etiqueta -- se llega acá tocando su fila en
 * Etiquetas. Sin límite de fecha: el total de una etiqueta (p. ej. un viaje)
 * casi siempre cruza meses. */
export default function TagTransactionsScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const query = useInfiniteTransactions({ tag });
  const paged = usePagedScroll(query);
  const totalsQ = useTransactionTotals({ tag });
  const { data: tags } = useTags();
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();
  const tagObj = tags?.find((t) => t.id === tag);
  const { pendingDeleteIds, onSwipeDelete } = useSwipeDeleteTransactions();

  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';

  const loaded = useMemo(() => flattenPages(query.data), [query.data]);
  const items = useMemo(
    () => loaded.filter((t) => !pendingDeleteIds.has(t.id)),
    [loaded, pendingDeleteIds],
  );
  // El total sale del servidor (toda la etiqueta, no sólo lo que ya se cargó).
  const totals = useMemo(
    () =>
      totalsForCurrency(
        totalsQ.data,
        currency,
        loaded.filter((t) => pendingDeleteIds.has(t.id)),
      ),
    [totalsQ.data, currency, loaded, pendingDeleteIds],
  );
  const days = useMemo(() => groupByDay(items), [items]);

  const refresh = usePullRefresh(query.isFetching && !query.isLoading, () => query.refetch());

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={tagObj?.name ?? 'Etiqueta'} />
      <ScrollView
        contentContainerClassName="gap-3 py-2"
        refreshControl={refresh}
        onScroll={paged.onScroll}
        scrollEventThrottle={paged.scrollEventThrottle}
      >
        <SummaryTriple income={totals.income} expenses={totals.expenses} currency={currency} />

        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : items.length === 0 ? (
          <EmptyState title="Sin movimientos" hint="Todavía no hay transacciones con esta etiqueta." />
        ) : (
          days.map((day) => (
            <View key={day.date}>
              <Text className="text-text-muted pb-1 pt-3 text-xs font-semibold uppercase tracking-wide">
                {formatDayHeader(day.date)}
              </Text>
              <View className="overflow-hidden rounded-3xl border border-border/60 bg-surface/95 px-4">
                {day.data.map((item, i) => (
                  <View key={item.id}>
                    {i > 0 ? <View className="h-px bg-border/30" /> : null}
                    <TransactionRow
                      txn={item}
                      category={item.category ? categories.get(item.category) : undefined}
                      wallet={wallets.get(item.wallet)}
                      toWallet={item.to_wallet ? wallets.get(item.to_wallet) : undefined}
                      onPress={() => router.push(`/transaction/${item.id}`)}
                      onSwipeDelete={() => onSwipeDelete(item.id)}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
        <LoadMoreFooter
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          onLoadMore={paged.loadMore}
        />
      </ScrollView>
    </Screen>
  );
}
