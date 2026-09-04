import { useMemo, useState } from 'react';
import { Link, router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { FadeInView } from '@/components/ui/FadeInView';
import { useUIStore } from '@/store/ui';

import {
  useBudgetReport,
  useDashboardSummary,
  useNetWorth,
  useScheduled,
  useTransactions,
  useWallets,
} from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import type { ScheduledItem } from '@/api/types';
import { AddTransactionFab } from '@/components/AddTransactionFab';
import { BudgetProgressRow } from '@/components/BudgetProgressRow';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { SectionHeader } from '@/components/SectionHeader';
import { SubTabs } from '@/components/SubTabs';
import { SummaryTriple } from '@/components/SummaryTriple';
import { TransactionRow } from '@/components/TransactionRow';
import { WalletRow } from '@/components/WalletRow';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { currentYearMonth, formatDayHeader, formatShortDate, monthRange } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { groupByDay, summarizeByType } from '@/lib/transactions';

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
        section="overview"
        title="Vista general"
        subtitle={
          <Money
            value={netWorth.data?.net}
            currency={currency}
            signed
            className="text-3xl font-bold text-white"
          />
        }
      >
        <SubTabs
          tone="light"
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
  const summary = useDashboardSummary();
  const wallets = useWallets();
  const budget = useBudgetReport();
  const scheduled = useScheduled();

  const spendingWallets = (wallets.data ?? []).filter((w) => w.purpose === 'spending');
  const loading = summary.isLoading || wallets.isLoading;

  if (loading) return <LoadingState />;
  if (summary.isError)
    return <ErrorState error={summary.error} onRetry={summary.refetch} />;

  return (
    <ScrollView contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-4">
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
              {summary.data.pending_email_imports} importación(es) por correo pendientes.
            </Text>
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
              {i > 0 ? <View className="h-px bg-border/60" /> : null}
              <WalletRow wallet={w} />
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
              {i > 0 ? <View className="h-px bg-border/60" /> : null}
              <BudgetProgressRow row={row} currency={currency} />
            </View>
          ))
        )}
      </Card>
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

  const items = txQuery.data ?? [];
  const totals = useMemo(() => summarizeByType(items), [items]);
  const days = useMemo(() => groupByDay(items), [items]);
  const currency = items[0]?.currency ?? 'USD';

  return (
    <ScrollView contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-3">
      <MonthSwitcher value={month} onChange={onMonth} />
      <SummaryTriple income={totals.income} expenses={totals.expenses} currency={currency} />

      {txQuery.isLoading ? (
        <LoadingState />
      ) : txQuery.isError ? (
        <ErrorState error={txQuery.error} onRetry={txQuery.refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="Sin movimientos este mes" hint="Agrega uno con el botón +." />
      ) : (
        days.map((day, di) => (
          <FadeInView key={day.date} index={di}>
            <Text className="text-text-muted pb-1 pt-3 text-xs font-semibold uppercase tracking-wide">
              {formatDayHeader(day.date)}
            </Text>
            <View className="rounded-2xl border border-border bg-surface px-4">
              {day.data.map((item, i) => (
                <View key={item.id}>
                  {i > 0 ? <View className="h-px bg-border/60" /> : null}
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
          </FadeInView>
        ))
      )}
    </ScrollView>
  );
}
