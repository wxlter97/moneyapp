import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useCashflow, useCategoryTrends } from '@/api/queries';
import type { CategoryTrend } from '@/api/types';
import { CashflowChart } from '@/components/CashflowChart';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { toNumber } from '@/lib/money';
import { useWorkspaceStore } from '@/store/workspace';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

type Window = '3' | '6' | '12';

/**
 * Ingresos vs. gastos mes a mes + qué categorías crecieron (o bajaron) más
 * entre el mes en curso y el anterior. Fase 2 del roadmap ("Tendencias").
 */
export default function TrendsScreen() {
  const colors = useColors();
  const [window, setWindow] = useState<Window>('6');
  const months = Number(window);

  const cashflowQ = useCashflow(months);
  const trendsQ = useCategoryTrends(months);
  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';

  const loading = cashflowQ.isLoading || trendsQ.isLoading;
  const refreshing = cashflowQ.isFetching || trendsQ.isFetching;
  const refresh = usePullRefresh(loading ? false : refreshing, () => {
    cashflowQ.refetch();
    trendsQ.refetch();
  });

  const categories = trendsQ.data?.categories ?? [];
  // El servicio ya ordena por `change` descendente -- el que más creció
  // primero es simplemente tomar el principio; el que más bajó, el final.
  const grew = categories.filter((c) => toNumber(c.change) > 0).slice(0, 5);
  const shrank = categories
    .filter((c) => toNumber(c.change) < 0)
    .slice(-5)
    .reverse();

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Tendencias" />
      <ScrollView contentContainerClassName="gap-4 py-2" refreshControl={refresh}>
        <View className="px-1">
          <Segmented
            value={window}
            onChange={setWindow}
            options={[
              { value: '3', label: '3 meses' },
              { value: '6', label: '6 meses' },
              { value: '12', label: '12 meses' },
            ]}
          />
        </View>

        {loading ? (
          <LoadingState />
        ) : cashflowQ.isError ? (
          <ErrorState error={cashflowQ.error} onRetry={cashflowQ.refetch} />
        ) : (
          <>
            <Card title="Ingresos vs. gastos">
              <CashflowChart points={cashflowQ.data ?? []} />
              <View className="flex-row items-center justify-center gap-5 pt-3">
                <Legend color={colors.income} label="Ingresos" />
                <Legend color={colors.expense} label="Gastos" />
              </View>
            </Card>

            <Card title="Categorías que más crecieron">
              {grew.length === 0 ? (
                <Text className="text-text-muted py-2 text-sm">
                  Nada creció de forma notable este mes.
                </Text>
              ) : (
                grew.map((c, i) => (
                  <TrendRow key={c.category} trend={c} currency={currency} first={i === 0} />
                ))
              )}
            </Card>

            {shrank.length > 0 ? (
              <Card title="Categorías que más bajaron">
                {shrank.map((c, i) => (
                  <TrendRow key={c.category} trend={c} currency={currency} first={i === 0} />
                ))}
              </Card>
            ) : null}

            {categories.length === 0 ? (
              <EmptyState title="Sin gastos categorizados" hint="Todavía no hay suficiente historial." />
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-text-muted text-xs">{label}</Text>
    </View>
  );
}

function TrendRow({
  trend,
  currency,
  first,
}: {
  trend: CategoryTrend;
  currency: string;
  first: boolean;
}) {
  const colors = useColors();
  const change = toNumber(trend.change);
  // Para una categoría de gasto, crecer es malo (rojo) y bajar es bueno
  // (verde) -- lo inverso del signo de `change`.
  const grew = change >= 0;
  const lastAmount = trend.amounts[trend.amounts.length - 1];

  return (
    <View className={`flex-row items-center justify-between py-2.5 ${first ? '' : 'border-t border-border/30'}`}>
      <View className="flex-1 pr-2">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {trend.category_name ?? 'Sin categoría'}
        </Text>
        <Money value={lastAmount} currency={currency} className="text-text-muted text-xs" />
      </View>
      <View className="items-end gap-0.5">
        <View className="flex-row items-center gap-1">
          {/* Mismo glifo que "sube" siempre -- se espeja para "baja". */}
          <View style={{ transform: [{ scaleY: grew ? 1 : -1 }] }}>
            <Icon name="trending" size={12} color={grew ? colors.expense : colors.income} />
          </View>
          <Money
            value={change}
            currency={currency}
            parens
            tone={grew ? 'expense' : 'income'}
            className="text-sm font-semibold"
          />
        </View>
        <Text className="text-text-muted text-[11px]">
          {trend.change_pct == null
            ? 'nueva'
            : `${trend.change_pct >= 0 ? '+' : ''}${trend.change_pct.toFixed(0)}%`}
        </Text>
      </View>
    </View>
  );
}
