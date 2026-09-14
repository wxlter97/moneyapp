import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useBudgetReport } from '@/api/queries';
import type { BudgetGroup, ISODate } from '@/api/types';
import { BudgetProgressRow } from '@/components/BudgetProgressRow';
import { PeriodSwitcher } from '@/components/PeriodSwitcher';
import { SectionHeader } from '@/components/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Ring } from '@/components/ui/Ring';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useColors } from '@/theme';
import { todayISO } from '@/lib/date';
import { periodStart } from '@/lib/periods';
import { toNumber } from '@/lib/money';
import { useWorkspaceStore } from '@/store/workspace';

export default function BudgetScreen() {
  const colors = useColors();
  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';
  const budgetPeriod = activeWorkspace?.budget_period ?? 'monthly';

  // `override`: el período al que el usuario navegó a mano con el switcher.
  // `null` mientras tanto -- así, si `budgetPeriod` todavía no cargó del
  // workspace (llega async) y cambia de 'monthly' (el default local) a lo
  // que sea real, `start` lo sigue en vez de quedar congelado en un límite
  // de período que ya no corresponde.
  const [override, setOverride] = useState<ISODate | null>(null);
  const start = override ?? periodStart(todayISO(), budgetPeriod);
  const budget = useBudgetReport(start);

  const totals = budget.data?.totals;
  const budgeted = toNumber(totals?.budgeted);
  const spent = toNumber(totals?.spent);
  const remaining = toNumber(totals?.remaining);
  const over = remaining < 0;
  const progress = budgeted > 0 ? spent / budgeted : 0;

  const openEditor = () => router.push(`/budget-edit?period_start=${start}`);

  const refresh = usePullRefresh(budget.isFetching && !budget.isLoading, () => budget.refetch());

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        title="Presupuesto"
        right={
          <Pressable
            onPress={openEditor}
            className="rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
            accessibilityRole="button"
          >
            <Text className="text-text text-sm font-semibold">Ajustar</Text>
          </Pressable>
        }
        subtitle={
          <View>
            {/* Tamaño "hero" (52px) reservado para el patrimonio neto en
                Vista general -- acá va una escala secundaria: este mismo
                número se repite, más grande, dentro del anillo de abajo, así
                que este texto no necesita competir con él. */}
            <Money
              value={Math.abs(remaining)}
              currency={currency}
              className="text-[34px] font-bold leading-[38px]"
            />
            <Text className="text-text-muted text-sm">
              {over ? 'te pasaste' : 'te queda'} de{' '}
              <Money value={budgeted} currency={currency} tone="muted" />
            </Text>
          </View>
        }
      />

      <ScrollView
        contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-4"
        refreshControl={refresh}
      >
        <PeriodSwitcher value={start} period={budgetPeriod} onChange={setOverride} />

        {budget.isLoading ? (
          <LoadingState />
        ) : budget.isError || !budget.data ? (
          <ErrorState error={budget.error} onRetry={budget.refetch} />
        ) : budget.data.rows.length === 0 ? (
          <EmptyState
            title="Sin presupuesto este período"
            hint="Toca «Ajustar» arriba para fijar un monto por grupo."
          />
        ) : (
          <>
            <View className="items-center py-2">
              <Ring
                progress={progress}
                color={over ? colors.expense : colors.income}
              >
                <Money
                  value={Math.abs(remaining)}
                  currency={currency}
                  className="text-2xl font-bold text-text"
                />
                <Text className="text-text-muted mt-1 text-xs uppercase tracking-wide">
                  {over ? 'excedido' : 'restante'}
                </Text>
                <Text className="text-text-muted mt-0.5 text-[11px]">
                  de <Money value={budgeted} currency={currency} tone="muted" />
                </Text>
              </Ring>
            </View>

            <Card title="Total del período">
              <View className="flex-row justify-between">
                <Labeled label="Presupuestado">
                  <Money value={budgeted} currency={currency} />
                </Labeled>
                <Labeled label="Gastado">
                  <Money value={spent} currency={currency} tone="expense" />
                </Labeled>
                <Labeled label="Disponible">
                  <Money value={remaining} currency={currency} signed />
                </Labeled>
              </View>
            </Card>

            {budget.data.groups.map((g) => (
              <GroupCard
                key={g.group ?? g.group_name}
                group={g}
                currency={currency}
                from={budget.data!.period_start}
                to={budget.data!.period_end}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function GroupCard({
  group,
  currency,
  from,
  to,
}: {
  group: BudgetGroup;
  currency: string;
  from: ISODate;
  to: ISODate;
}) {
  const spent = toNumber(group.spent);
  const budgeted = toNumber(group.budgeted);
  const remaining = toNumber(group.remaining);
  // Antes entraba con un fundido escalonado (`Card animated index={i}`) --
  // Presupuesto es una pestaña, se revisita todo el tiempo, así que el goteo
  // se repetía en cada visita en vez de verse una sola vez.
  return (
    <Card title={group.group_name}>
      <Text className="text-text-muted mb-3 text-xs">
        <Money value={spent} currency={currency} tone="muted" />
        <Text> / </Text>
        <Money value={budgeted} currency={currency} tone="muted" />
        <Text> (</Text>
        <Money value={remaining} currency={currency} signed className="text-xs" />
        <Text>)</Text>
      </Text>
      {group.rows.map((row, i) => (
        <View key={row.category}>
          {i > 0 ? <View className="h-px bg-border/30" /> : null}
          <BudgetProgressRow row={row} currency={currency} from={from} to={to} />
        </View>
      ))}
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="text-text-muted text-[11px] uppercase tracking-wide">{label}</Text>
      {children}
    </View>
  );
}
