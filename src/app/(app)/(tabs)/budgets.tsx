import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useBudgetReport } from '@/api/queries';
import type { BudgetGroup } from '@/api/types';
import { BudgetProgressRow } from '@/components/BudgetProgressRow';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { SectionHeader } from '@/components/SectionHeader';
import { SubTabs } from '@/components/SubTabs';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { Ring } from '@/components/ui/Ring';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useColors } from '@/theme';
import { currentYearMonth } from '@/lib/date';
import { toNumber } from '@/lib/money';

type Tab = 'restante' | 'informacion';

export default function BudgetScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>('restante');
  const [month, setMonth] = useState(currentYearMonth);
  const budget = useBudgetReport(month);
  const currency = 'USD';

  const totals = budget.data?.totals;
  const budgeted = toNumber(totals?.budgeted);
  const spent = toNumber(totals?.spent);
  const remaining = toNumber(totals?.remaining);
  const over = remaining < 0;
  const progress = budgeted > 0 ? spent / budgeted : 0;

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        section="budget"
        title="Presupuesto"
        subtitle={
          <Text className="text-sm text-white/80">
            {over ? 'Te pasaste por ' : 'Te queda '}
            <Money value={Math.abs(remaining)} currency={currency} className="font-semibold text-white" />
          </Text>
        }
      >
        <SubTabs
          tone="light"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'restante', label: 'Restante' },
            { value: 'informacion', label: 'Información' },
          ]}
        />
      </SectionHeader>

      <ScrollView contentContainerClassName="px-4 pb-28 pt-4 self-center w-full max-w-[560px] gap-4">
        <MonthSwitcher value={month} onChange={setMonth} />

        {budget.isLoading ? (
          <LoadingState />
        ) : budget.isError || !budget.data ? (
          <ErrorState error={budget.error} onRetry={budget.refetch} />
        ) : budget.data.rows.length === 0 ? (
          <EmptyState
            title="Sin presupuesto este mes"
            hint="Define montos por categoría desde Herramientas → Categorías."
          />
        ) : tab === 'restante' ? (
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
            {budget.data.groups.map((g, i) => (
              <GroupCard key={g.group ?? g.group_name} group={g} currency={currency} index={i} />
            ))}
          </>
        ) : (
          <>
            <Card title="Total del mes">
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
            {budget.data.groups.map((g, i) => (
              <GroupCard
                key={g.group ?? g.group_name}
                group={g}
                currency={currency}
                showProvision
                index={i}
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
  showProvision = false,
  index = 0,
}: {
  group: BudgetGroup;
  currency: string;
  showProvision?: boolean;
  index?: number;
}) {
  const remaining = toNumber(group.remaining);
  return (
    <Card
      title={group.group_name}
      animated
      index={index}
      action={
        <Money
          value={remaining}
          currency={currency}
          signed
          className="text-xs font-semibold"
        />
      }
    >
      {group.rows.map((row, i) => (
        <View key={row.category}>
          {i > 0 ? <View className="h-px bg-border/60" /> : null}
          <BudgetProgressRow row={row} currency={currency} showProvision={showProvision} />
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
