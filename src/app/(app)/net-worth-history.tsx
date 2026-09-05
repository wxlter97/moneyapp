import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useMonthlySnapshots } from '@/api/queries';
import { NetWorthChart } from '@/components/NetWorthChart';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatYearMonth } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { useWorkspaceStore } from '@/store/workspace';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * Historial mensual de patrimonio neto: usa `MonthlySnapshot`, que Celery
 * Beat genera solo el día 1 de cada mes al cerrar el anterior — no hay nada
 * que crear desde la app, solo mostrarlo.
 */
export default function NetWorthHistoryScreen() {
  const colors = useColors();
  const q = useMonthlySnapshots();
  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());

  // El backend los da más nuevo primero; el gráfico los quiere en el tiempo.
  const ascending = useMemo(() => [...(q.data ?? [])].reverse(), [q.data]);
  const latest = q.data?.[0];
  const previous = q.data?.[1];
  // Ver Workspace.base_currency: es en la que `close_month()` ya convierte
  // cada MonthlySnapshot al guardarlo.
  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';

  const delta = latest && previous ? toNumber(latest.total_net_worth) - toNumber(previous.total_net_worth) : null;

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Patrimonio neto" />
      <ScrollView contentContainerClassName="gap-4 py-2" refreshControl={refresh}>
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : ascending.length === 0 ? (
          <EmptyState
            title="Todavía sin historial"
            hint="Se genera automáticamente al cerrar cada mes. Volvé a fin de mes."
          />
        ) : (
          <>
            <Card>
              {latest ? (
                <View className="gap-1 pb-3">
                  <Text className="text-text-muted text-xs">
                    {formatYearMonth({ year: latest.year, month: latest.month })}
                  </Text>
                  <Money
                    value={latest.total_net_worth}
                    currency={currency}
                    hero
                    className="text-[36px] leading-[40px]"
                  />
                  {delta !== null ? (
                    <View className="flex-row items-center gap-1">
                      <Icon
                        name="trending"
                        size={12}
                        color={delta >= 0 ? colors.income : colors.expense}
                      />
                      <Text
                        className="text-xs"
                        style={{ color: delta >= 0 ? colors.income : colors.expense, fontFamily: fonts.semibold }}
                      >
                        {delta >= 0 ? '+' : ''}
                        {delta.toFixed(2)} {currency} vs. mes anterior
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <NetWorthChart snapshots={ascending} />
            </Card>

            <Card title="Mes a mes">
              {[...(q.data ?? [])].map((s, i) => (
                <View
                  key={s.id}
                  className={`flex-row items-center justify-between py-2.5 ${
                    i > 0 ? 'border-t border-border/30' : ''
                  }`}
                >
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    {formatYearMonth({ year: s.year, month: s.month })}
                  </Text>
                  <View className="items-end">
                    <Money value={s.total_net_worth} currency={currency} className="text-sm font-semibold" />
                    <Text className="text-text-muted text-[11px]">
                      +{toNumber(s.total_income).toFixed(0)} / -{toNumber(s.total_expenses).toFixed(0)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
