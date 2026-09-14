import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useBudgetReport } from '@/api/queries';
import type { BudgetGroup, ISODate } from '@/api/types';
import { BudgetProgressRow } from '@/components/BudgetProgressRow';
import { PeriodSwitcher } from '@/components/PeriodSwitcher';
import { SectionHeader } from '@/components/SectionHeader';
import { BudgetMeter } from '@/components/ui/BudgetMeter';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { todayISO } from '@/lib/date';
import { periodStart } from '@/lib/periods';
import { toNumber } from '@/lib/money';
import { useDesktopContentWidth } from '@/lib/responsive';
import { useWorkspaceStore } from '@/store/workspace';

const DESKTOP_MAX_WIDTH = 900;

export default function BudgetScreen() {
  // Ancho responsivo, no un booleano desktop/mobile: a un ancho de escritorio
  // "justo" (~900-1000px) todavía no sobra espacio de verdad para 2 columnas
  // -- `useDesktopContentWidth` ya lo deja en 560 (como mobile) en ese caso,
  // sin invadir el margen donde vive `SideNav` (hallazgo real al implementar
  // esto: un ancho fijo más grande hacía que el sidebar quedara ENCIMA de
  // las cards, no al costado -- ver el propio docstring de `SideNav`).
  const contentWidth = useDesktopContentWidth(DESKTOP_MAX_WIDTH);
  const showGrid = contentWidth > 560;
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

  const openEditor = () => router.push(`/budget-edit?period_start=${start}`);

  const refresh = usePullRefresh(budget.isFetching && !budget.isLoading, () => budget.refetch());

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        title="Presupuesto"
        maxWidth={contentWidth}
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
            {/* Cifra protagonista de esta pantalla (Archivo Black, vía
                `hero`) -- ya no se repite dentro del medidor de abajo: el
                medidor no es un anillo con un centro que pedía duplicarla,
                así que este número no compite con nada. */}
            <Money
              hero
              animate
              value={Math.abs(remaining)}
              currency={currency}
              tone={over ? 'expense' : 'default'}
              className="text-[34px] leading-[38px]"
            />
            <Text className="text-text-muted text-sm">
              {over ? 'te pasaste' : 'te queda'} de{' '}
              <Money animate value={budgeted} currency={currency} tone="muted" />
            </Text>
          </View>
        }
      />

      <ScrollView
        contentContainerClassName="px-4 pb-36 pt-4 self-center w-full gap-4"
        contentContainerStyle={{ maxWidth: contentWidth }}
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
            <View className="py-1">
              <BudgetMeter spent={spent} budgeted={budgeted} currency={currency} size="lg" showTicks />
            </View>

            <Card title="Total del período">
              <View className="flex-row justify-between">
                <Labeled label="Presupuestado">
                  <Money animate value={budgeted} currency={currency} />
                </Labeled>
                <Labeled label="Gastado">
                  <Money animate value={spent} currency={currency} tone="expense" />
                </Labeled>
                <Labeled label="Disponible">
                  <Money animate value={remaining} currency={currency} signed />
                </Labeled>
              </View>
            </Card>

            {/* Grupos en 2 columnas en desktop -- son cards independientes
                entre sí (a diferencia de Carteras, sin jerarquía padre/hijo
                que romper al partirlos en columnas), así que envolverlos en
                una grilla es seguro. */}
            <View className={showGrid ? 'flex-row flex-wrap gap-4' : 'gap-4'}>
              {budget.data.groups.map((g) => (
                <View key={g.group ?? g.group_name} className={showGrid ? 'w-[calc(50%-8px)]' : 'w-full'}>
                  <GroupCard
                    group={g}
                    currency={currency}
                    from={budget.data!.period_start}
                    to={budget.data!.period_end}
                  />
                </View>
              ))}
            </View>
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
