import { Text, View } from 'react-native';

import { Money } from '@/components/ui/Money';

interface SummaryTripleProps {
  income: number;
  expenses: number;
  net?: number;
  currency?: string;
}

/** Bloque ingresos / gastos / neto usado en Historial y Dashboard. */
export function SummaryTriple({ income, expenses, net, currency = 'USD' }: SummaryTripleProps) {
  const netValue = net ?? income - expenses;

  return (
    <View className="flex-row rounded-2xl border border-border bg-surface">
      <Cell label="Ingresos">
        <Money value={income} currency={currency} tone="income" className="text-base font-semibold" />
      </Cell>
      <View className="w-px bg-border" />
      <Cell label="Gastos">
        <Money value={expenses} currency={currency} tone="expense" className="text-base font-semibold" />
      </Cell>
      <View className="w-px bg-border" />
      <Cell label="Neto">
        <Money value={netValue} currency={currency} signed className="text-base font-semibold" />
      </Cell>
    </View>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-1 items-center gap-1 px-2 py-3">
      <Text className="text-text-muted text-[11px] uppercase tracking-wide">{label}</Text>
      {children}
    </View>
  );
}
