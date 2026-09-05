import { useMemo, useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FadeInView } from '@/components/ui/FadeInView';
import { useUIStore } from '@/store/ui';

import {
  useBudgetReport,
  useDashboardSummary,
  useDeleteTransaction,
  useNetWorth,
  useScheduled,
  useTransactions,
  useWallets,
} from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import type { ScheduledItem } from '@/api/types';
import { AddTransactionFab } from '@/components/AddTransactionFab';
import { BudgetProgressRow } from '@/components/BudgetProgressRow';
import { CategorySpendChart } from '@/components/CategorySpendChart';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { SectionHeader } from '@/components/SectionHeader';
import { SubTabs } from '@/components/SubTabs';
import { SummaryTriple } from '@/components/SummaryTriple';
import { TransactionRow } from '@/components/TransactionRow';
import { WalletRow } from '@/components/WalletRow';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { SearchField } from '@/components/ui/SearchField';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { currentYearMonth, formatDayHeader, formatShortDate, monthRange } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { groupByDay, summarizeByType } from '@/lib/transactions';
import { useSnackbarStore } from '@/store/snackbar';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

export default function OverviewScreen() {
  const tab = useUIStore((s) => s.overviewTab);
  const setTab = useUIStore((s) => s.setOverviewTab);
  const [month, setMonth] = useState(currentYearMonth);

  const netWorth = useNetWorth();
  const wallets = useWallets();
  const currency = wallets.data?.[0]?.currency ?? 'USD';

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        title="Vista general"
        subtitle={
          <Pressable
            onPress={() => {
              haptics.tap();
              router.push('/net-worth-history');
            }}
            accessibilityRole="button"
            accessibilityLabel="Ver historial de patrimonio neto"
            className="w-full items-center active:opacity-70"
          >
            <Money
              value={netWorth.data?.net}
              currency={currency}
              hero
              className="text-center text-[52px] leading-[56px]"
            />
          </Pressable>
        }
      >
        <SubTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'resumen', label: 'Resumen' },
            { value: 'lista', label: 'Lista' },
          ]}
        />
      </SectionHeader>

      {tab === 'resumen' ? (
        <ResumenTab currency={currency} />
      ) : (
        <ListaTab month={month} onMonth={setMonth} />
      )}

      <AddTransactionFab />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
function ResumenTab({ currency }: { currency: string }) {
  const colors = useColors();
  const summary = useDashboardSummary();
  const wallets = useWallets();
  const budget = useBudgetReport();
  const scheduled = useScheduled();
  const { map: categories } = useCategoryMap();

  const spendingWallets = (wallets.data ?? []).filter((w) => w.purpose === 'spending');
  const loading = summary.isLoading || wallets.isLoading;
  const refreshing = summary.isFetching || wallets.isFetching || budget.isFetching || scheduled.isFetching;
  const refresh = usePullRefresh(loading ? false : refreshing, () => {
    summary.refetch();
    wallets.refetch();
    budget.refetch();
    scheduled.refetch();
  });

  if (loading) return <LoadingState />;
  if (summary.isError)
    return <ErrorState error={summary.error} onRetry={summary.refetch} />;

  return (
    <ScrollView
      contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-4"
      refreshControl={refresh}
    >
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
            <Pressable
              onPress={() => {
                haptics.tap();
                router.push('/imports');
              }}
              accessibilityRole="button"
              className="flex-row items-center gap-1.5 self-start active:opacity-60"
            >
              <Icon name="inbox" size={14} color={colors.warning} />
              <Text className="text-warning text-xs" style={{ fontFamily: fonts.semibold }}>
                {summary.data.pending_email_imports} importación(es) por correo pendientes.
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScheduledCard items={scheduled.data ?? []} loading={scheduled.isLoading} currency={currency} />

      <Card
        title="Carteras"
        animated
        index={1}
        action={
          <Link href="/wallets" asChild>
            <Text className="text-primary text-xs">Ver todo</Text>
          </Link>
        }
      >
        {spendingWallets.length === 0 ? (
          <EmptyState title="Sin carteras de gasto" />
        ) : (
          spendingWallets.map((w, i) => (
            <View key={w.id}>
              {i > 0 ? <View className="h-px bg-border/30" /> : null}
              <Pressable
                onPress={() => {
                  haptics.tap();
                  router.push(`/wallet-transactions?wallet=${w.id}`);
                }}
                className="active:opacity-60"
                accessibilityRole="button"
              >
                <WalletRow wallet={w} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Card
        title="Presupuesto"
        animated
        index={2}
        action={
          <Link href="/budgets" asChild>
            <Text className="text-primary text-xs">Ver todo</Text>
          </Link>
        }
      >
        {budget.isError ? (
          <ErrorState error={budget.error} onRetry={budget.refetch} />
        ) : (budget.data?.rows.length ?? 0) === 0 ? (
          <EmptyState title="Sin presupuesto este mes" />
        ) : (
          budget.data!.rows.slice(0, 5).map((row, i) => (
            <View key={row.category}>
              {i > 0 ? <View className="h-px bg-border/30" /> : null}
              <BudgetProgressRow row={row} currency={currency} month={currentYearMonth()} />
            </View>
          ))
        )}
      </Card>

      {(summary.data?.top_expense_categories.length ?? 0) > 0 ? (
        <Card title="Gasto por categoría" animated index={3}>
          <CategorySpendChart
            rows={summary.data!.top_expense_categories}
            currency={currency}
            categoryColor={(id) => categories.get(id)?.color}
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function ScheduledCard({
  items,
  loading,
  currency,
}: {
  items: ScheduledItem[];
  loading: boolean;
  currency: string;
}) {
  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <Card title="Programado" animated index={0}>
      {items.map((it, i) => (
        <View
          key={`${it.kind}-${it.source_id}-${it.date}`}
          className={`flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border/60' : ''}`}
        >
          <View className="w-12">
            <Text className="text-text-muted text-xs">{formatShortDate(it.date)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text text-sm" numberOfLines={1}>
              {it.description || it.category_name || 'Programado'}
            </Text>
            <Text className="text-text-muted text-xs" numberOfLines={1}>
              {it.wallet_name}
              {it.kind === 'installment' ? ' · cuota' : ''}
            </Text>
          </View>
          <Money
            value={-toNumber(it.amount)}
            currency={currency}
            parens
            tone="muted"
            className="text-sm"
          />
        </View>
      ))}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Lista (movimientos del mes, agrupados por día)
// ---------------------------------------------------------------------------
type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';

function ListaTab({
  month,
  onMonth,
}: {
  month: ReturnType<typeof currentYearMonth>;
  onMonth: (m: ReturnType<typeof currentYearMonth>) => void;
}) {
  const range = useMemo(() => monthRange(month), [month]);
  const txQuery = useTransactions({ date_after: range.from, date_before: range.to });
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();
  const deleteTxn = useDeleteTransaction();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  // Ocultas de inmediato al deslizar-borrar; el borrado real llega con el
  // timeout del snackbar si nadie toca "Deshacer" antes.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());

  const allItems = txQuery.data ?? [];
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((t) => {
      if (pendingDeleteIds.has(t.id)) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (!q) return true;
      const cat = t.category ? categories.get(t.category)?.name : undefined;
      const haystack = `${t.description ?? ''} ${cat ?? ''} ${wallets.get(t.wallet)?.name ?? ''}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [allItems, pendingDeleteIds, typeFilter, search, categories, wallets]);

  const totals = useMemo(() => summarizeByType(items), [items]);
  const days = useMemo(() => groupByDay(items), [items]);
  const currency = items[0]?.currency ?? allItems[0]?.currency ?? 'USD';

  const refresh = usePullRefresh(txQuery.isFetching && !txQuery.isLoading, () => txQuery.refetch());

  function onSwipeDelete(id: string) {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    showSnackbar({
      message: 'Movimiento eliminado.',
      actionLabel: 'Deshacer',
      onAction: () => {
        haptics.selection();
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
      onTimeout: async () => {
        try {
          await deleteTxn.mutateAsync(id);
        } catch {
          haptics.error();
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      },
    });
  }

  return (
    <ScrollView
      contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-3"
      refreshControl={refresh}
      keyboardShouldPersistTaps="handled"
    >
      <MonthSwitcher value={month} onChange={onMonth} />
      <SummaryTriple income={totals.income} expenses={totals.expenses} currency={currency} />

      <SearchField value={search} onChange={setSearch} placeholder="Buscar movimientos" />
      <Segmented
        value={typeFilter}
        onChange={setTypeFilter}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'income', label: 'Ingresos' },
          { value: 'expense', label: 'Gastos' },
          { value: 'transfer', label: 'Transfer.' },
        ]}
      />

      {txQuery.isLoading ? (
        <LoadingState />
      ) : txQuery.isError ? (
        <ErrorState error={txQuery.error} onRetry={txQuery.refetch} />
      ) : allItems.length === 0 ? (
        <EmptyState title="Sin movimientos este mes" hint="Agrega uno con el botón +." />
      ) : items.length === 0 ? (
        <EmptyState title="Sin resultados" hint="Probá con otro texto o filtro." />
      ) : (
        days.map((day, di) => (
          <FadeInView key={day.date} index={di}>
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
          </FadeInView>
        ))
      )}
    </ScrollView>
  );
}
