import { Text, View } from 'react-native';

import { Money } from '@/components/ui/Money';

interface SummaryTripleProps {
  income: number;
  expenses: number;
  net?: number;
  currency?: string;
}

/** Bloque ingresos / gastos / neto usado en Historial y Dashboard. `animate`
 * (siempre encendido acá): este total cambia por una acción explícita --
 * cambiar de mes (`MonthSwitcher`) -- así que las cifras cuentan hasta el
 * valor nuevo en vez de saltar de golpe (pedido de la auditoría de producto,
 * Fase 6). */
export function SummaryTriple({ income, expenses, net, currency = 'USD' }: SummaryTripleProps) {
  const netValue = net ?? income - expenses;

  return (
    <View className="flex-row rounded-3xl border border-border/60 bg-surface/95">
      <Cell label="Ingresos">
        <Money animate value={income} currency={currency} tone="income" className="text-base font-semibold" />
      </Cell>
      <View className="w-px bg-border/60" />
      <Cell label="Gastos">
        <Money animate value={expenses} currency={currency} tone="expense" className="text-base font-semibold" />
      </Cell>
      <View className="w-px bg-border/60" />
      <Cell label="Neto">
        <Money animate value={netValue} currency={currency} signed className="text-base font-semibold" />
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
