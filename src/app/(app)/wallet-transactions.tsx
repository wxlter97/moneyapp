import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTransactions, useWallet } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { DayHeader } from '@/components/DayHeader';
import { TransactionRow } from '@/components/TransactionRow';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { TransactionListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { balanceAfterEach, groupByDay, useSwipeDeleteTransactions } from '@/lib/transactions';
import { toNumber } from '@/lib/money';
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
  const { pendingDeleteIds, onSwipeDelete } = useSwipeDeleteTransactions();

  const allItems = query.data ?? [];
  // Saldo de la cartera justo después de cada movimiento -- se camina hacia
  // atrás desde el saldo de hoy, así que hace falta el historial COMPLETO
  // (sin paginar, y SIN filtrar los pendientes de deshacer: el saldo de hoy
  // todavía los incluye hasta que el borrado se confirme de verdad).
  const balances = useMemo(
    () =>
      walletId && walletQ.data
        ? balanceAfterEach(allItems, toNumber(walletQ.data.current_balance), walletId)
        : new Map<string, number>(),
    [allItems, walletQ.data, walletId],
  );
  // Recién acá se ocultan las filas deslizadas-a-borrar -- después de
  // calcular `balances` contra el historial completo.
  const items = useMemo(
    () => allItems.filter((t) => !pendingDeleteIds.has(t.id)),
    [allItems, pendingDeleteIds],
  );
  const days = useMemo(() => groupByDay(items), [items]);

  const refresh = usePullRefresh(query.isFetching && !query.isLoading, () => query.refetch());

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader
        title={walletQ.data?.name ?? 'Cartera'}
        right={
          <View className="flex-row items-center gap-2">
            {walletQ.data?.billing_cycle_day ? (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  router.push(`/statement/${walletId}`);
                }}
                accessibilityRole="button"
                accessibilityLabel="Ver estado de cuenta"
                className="h-8 w-8 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
              >
                <Icon name="receipt" size={14} color={colors.textMuted} />
              </Pressable>
            ) : null}
            {walletQ.data?.card_product ? (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  router.push('/loyalty');
                }}
                accessibilityRole="button"
                accessibilityLabel="Ver recompensas"
                className="h-8 w-8 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
              >
                <Icon name="gift" size={14} color={colors.textMuted} />
              </Pressable>
            ) : null}
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
          </View>
        }
      />
      <ScrollView contentContainerClassName="gap-3 py-2" refreshControl={refresh}>
        {query.isLoading ? (
          <>
            <TransactionListSkeleton />
            <TransactionListSkeleton rows={2} />
          </>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : items.length === 0 ? (
          <EmptyState title="Sin movimientos" hint="Todavía no hay transacciones en esta cartera." />
        ) : (
          days.map((day) => (
            <View key={day.date}>
              <DayHeader date={day.date} />
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
                      balanceAfter={balances.get(item.id)}
                      onPress={() => router.push(`/transaction/${item.id}`)}
                      onSwipeDelete={() => onSwipeDelete(item.id)}
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
