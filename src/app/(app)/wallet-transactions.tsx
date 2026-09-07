import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTransactions, useWallet } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { TransactionRow } from '@/components/TransactionRow';
import { SummaryTriple } from '@/components/SummaryTriple';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { formatDayHeader } from '@/lib/date';
import { groupByDay, summarizeByType } from '@/lib/transactions';
import { useColors } from '@/theme';

/** Historial completo de movimientos de una cartera: se llega acá tocando
 * su fila (Dashboard o Carteras). Editar la cartera queda un toque más
 * lejos, en el ícono del lápiz de la cabecera. */
export default function WalletTransactionsScreen() {
  const colors = useColors();
  const { wallet: walletId } = useLocalSearchParams<{ wallet: string }>();
  const walletQ = useWallet(walletId);
  const query = useTransactions({ wallet: walletId });
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();

  const items = query.data ?? [];
  const totals = useMemo(() => summarizeByType(items), [items]);
  const days = useMemo(() => groupByDay(items), [items]);
  const currency = items[0]?.currency ?? walletQ.data?.currency ?? 'USD';

  const refresh = usePullRefresh(query.isFetching && !query.isLoading, () => query.refetch());

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader
        title={walletQ.data?.name ?? 'Cartera'}
        right={
          <Pressable
            onPress={() => {
              haptics.tap();
              router.push(`/wallet/${walletId}`);
            }}
            accessibilityRole="button"
            accessibilityLabel="Editar cartera"
            className="h-8 w-8 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
          >
            <Icon name="pencil" size={14} color={colors.textMuted} />
          </Pressable>
        }
      />
      <ScrollView contentContainerClassName="gap-3 py-2" refreshControl={refresh}>
        <SummaryTriple income={totals.income} expenses={totals.expenses} currency={currency} />

        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : items.length === 0 ? (
          <EmptyState title="Sin movimientos" hint="Todavía no hay transacciones en esta cartera." />
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
                      perspectiveWalletId={walletId}
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
