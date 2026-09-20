import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useInfiniteTransactions, useTransactionTotals } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { TransactionRow } from '@/components/TransactionRow';
import { LoadMoreFooter } from '@/components/ui/LoadMoreFooter';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SummaryTriple } from '@/components/SummaryTriple';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDayHeader, formatShortDate } from '@/lib/date';
import { flattenPages, usePagedScroll } from '@/lib/pagedList';
import { groupByDay, totalsForCurrency, useSwipeDeleteTransactions } from '@/lib/transactions';
import { useWorkspaceStore } from '@/store/workspace';

type Scope = 'range' | 'all';

/**
 * Movimientos de una categoría: se llega acá tocando su fila en el
 * Presupuesto (u otro origen que ya sepa el rango, como el top-gasto del
 * dashboard). Por defecto sólo `from`-`to` (con el que se abrió), con un
 * toggle para ver el histórico completo de la categoría sin límite de fecha.
 */
export default function CategoryTransactionsScreen() {
  const { category, from, to } = useLocalSearchParams<{ category: string; from: string; to: string }>();
  const [scope, setScope] = useState<Scope>('range');

  const hasRange = !!from && !!to;

  // `counts_toward_budget` va al servidor y no se filtra acá: esta pantalla
  // explica un número de Presupuesto, que ignora las marcadas «S/PRES.», y con
  // la lista paginada un filtro del lado del cliente dejaría páginas casi vacías
  // y un total distinto del de Presupuesto.
  const filters = useMemo(
    () =>
      scope === 'range' && hasRange
        ? { category, date_after: from, date_before: to, counts_toward_budget: true }
        : { category, counts_toward_budget: true },
    [scope, hasRange, category, from, to],
  );
  const query = useInfiniteTransactions(filters);
  const paged = usePagedScroll(query);
  const totalsQ = useTransactionTotals(filters);
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();
  const cat = categories.get(category);
  const { pendingDeleteIds, onSwipeDelete } = useSwipeDeleteTransactions();

  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';

  // También se ocultan las que se acaban de deslizar-borrar (ver
  // `useSwipeDeleteTransactions`).
  const loaded = useMemo(() => flattenPages(query.data), [query.data]);
  const items = useMemo(
    () => loaded.filter((t) => !pendingDeleteIds.has(t.id)),
    [loaded, pendingDeleteIds],
  );
  // El total sale del servidor (todo lo que cumple el filtro, no sólo lo cargado)
  // y se limita a la moneda base para no mezclar montos de otras carteras; cada
  // fila de la lista sí muestra su moneda real, sea cual sea.
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
      <ModalHeader title={cat?.name ?? 'Categoría'} />
      <ScrollView
        contentContainerClassName="gap-3 py-2"
        refreshControl={refresh}
        onScroll={paged.onScroll}
        scrollEventThrottle={paged.scrollEventThrottle}
      >
        <SummaryTriple income={totals.income} expenses={totals.expenses} currency={currency} />

        {hasRange ? (
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              {
                value: 'range',
                label: from === to ? formatShortDate(from) : `${formatShortDate(from)} – ${formatShortDate(to)}`,
              },
              { value: 'all', label: 'Todo el período' },
            ]}
          />
        ) : null}

        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title={scope === 'range' ? 'Sin movimientos en este rango' : 'Sin movimientos'}
            hint={
              scope === 'range' && hasRange
                ? 'Probá con «Todo el período» para ver el histórico completo.'
                : undefined
            }
          />
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
