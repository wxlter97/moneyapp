import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTransactions } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { TransactionRow } from '@/components/TransactionRow';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SummaryTriple } from '@/components/SummaryTriple';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDayHeader, formatYearMonth, monthRange } from '@/lib/date';
import { groupByDay, summarizeByType } from '@/lib/transactions';
import { useWorkspaceStore } from '@/store/workspace';

type Scope = 'month' | 'all';

/**
 * Movimientos de una categoría: se llega acá tocando su fila en el
 * Presupuesto. Por defecto sólo el mes marcado (con el que se abrió), con un
 * toggle para ver el histórico completo de la categoría sin límite de fecha.
 */
export default function CategoryTransactionsScreen() {
  const { category, y, m } = useLocalSearchParams<{ category: string; y: string; m: string }>();
  const [scope, setScope] = useState<Scope>('month');

  const year = Number(y);
  const month = Number(m);
  const hasMonth = Number.isFinite(year) && Number.isFinite(month) && year > 0 && month > 0;
  const range = useMemo(
    () => (hasMonth ? monthRange({ year, month }) : null),
    [hasMonth, year, month],
  );

  const query = useTransactions(
    scope === 'month' && range
      ? { category, date_after: range.from, date_before: range.to }
      : { category },
  );
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();
  const cat = categories.get(category);

  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';

  const items = query.data ?? [];
  // El total de arriba se suma sin convertir (no hay tasas acá) -- se
  // limita a la moneda base para no mezclar montos de otras carteras; cada
  // fila de la lista de abajo sí muestra su moneda real, sea cual sea.
  // También se excluyen las marcadas "S/PRES." (no cuentan para el
  // presupuesto) -- si no, este total no coincide con el que ya se ve en
  // Presupuesto (que sí las excluye, ver `budget_vs_actual` en el backend).
  // Igual se listan abajo (con su etiqueta) para que quede claro por qué no
  // suman.
  const totals = useMemo(
    () =>
      summarizeByType(
        items.filter((t) => t.currency === currency && t.counts_toward_budget),
      ),
    [items, currency],
  );
  const days = useMemo(() => groupByDay(items), [items]);

  const refresh = usePullRefresh(query.isFetching && !query.isLoading, () => query.refetch());

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={cat?.name ?? 'Categoría'} />
      <ScrollView contentContainerClassName="gap-3 py-2" refreshControl={refresh}>
        <SummaryTriple income={totals.income} expenses={totals.expenses} currency={currency} />

        {hasMonth ? (
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { value: 'month', label: formatYearMonth({ year, month }) },
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
            title={scope === 'month' ? 'Sin movimientos este mes' : 'Sin movimientos'}
            hint={
              scope === 'month' && hasMonth
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
                    />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
