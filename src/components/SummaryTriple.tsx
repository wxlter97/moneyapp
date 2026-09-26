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
 * Fase 6).
 *
 * Sin código de moneda dentro de cada celda: "USD 1,052.40" en tres
 * columnas de un tercio de pantalla se desbordaba (y el neto negativo
 * partía en dos líneas). La moneda es siempre la del workspace, así que
 * cada celda muestra sólo el número, en una línea, achicándose si hace
 * falta; el lector de pantalla igual recibe el monto con su moneda. */
const fit = {
  hideCurrency: true,
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.55,
} as const;

export function SummaryTriple({ income, expenses, net, currency = 'USD' }: SummaryTripleProps) {
  const netValue = net ?? income - expenses;

  return (
    <View className="flex-row rounded-3xl border border-border/60 bg-surface/95">
      <Cell label="Ingresos">
        <Money animate value={income} currency={currency} tone="income" className="text-base font-semibold" {...fit} />
      </Cell>
      <View className="w-px bg-border/60" />
      <Cell label="Gastos">
        <Money animate value={expenses} currency={currency} tone="expense" className="text-base font-semibold" {...fit} />
      </Cell>
      <View className="w-px bg-border/60" />
      <Cell label="Neto">
        <Money animate value={netValue} currency={currency} signed className="text-base font-semibold" {...fit} />
      </Cell>
    </View>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="min-w-0 flex-1 items-center gap-1 px-2 py-3">
      <Text className="text-text-muted text-[11px] uppercase tracking-wide">{label}</Text>
      {children}
    </View>
  );
}
