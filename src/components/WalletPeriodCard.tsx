import { Text, View } from 'react-native';

import type { WalletPeriodSummary } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { formatShortDate } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { fonts } from '@/theme/typography';

/** Variación % contra el período anterior; `null` si antes no hubo nada
 * (un "+∞%" no dice nada útil). */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Extracto de una cartera en un período, como el de un banco: saldo inicial
 * + entradas − salidas = saldo final, y cuánto cambió cada flujo contra el
 * período anterior (ver `wallets/{id}/period-summary/`). Las transferencias
 * cuentan: acá importa el saldo, no el presupuesto.
 */
export function WalletPeriodCard({
  summary,
  currency,
}: {
  summary: WalletPeriodSummary;
  currency: string;
}) {
  const inflows = toNumber(summary.inflows);
  const outflows = toNumber(summary.outflows);
  const prevLabel = `${formatShortDate(summary.previous.date_after)} – ${formatShortDate(summary.previous.date_before)}`;

  return (
    <View className="gap-2 rounded-3xl border border-border/60 bg-surface/95 p-4">
      <Line label="Saldo inicial" value={summary.opening_balance} currency={currency} />
      <Line
        label="Entradas"
        sign="+"
        value={summary.inflows}
        currency={currency}
        tone="income"
        change={pctChange(inflows, toNumber(summary.previous.inflows))}
        // Entrar más plata es bueno; salir más, no -- el color del cambio lo dice.
        goodWhenUp
      />
      <Line
        label="Salidas"
        sign="−"
        value={summary.outflows}
        currency={currency}
        tone="expense"
        change={pctChange(outflows, toNumber(summary.previous.outflows))}
      />
      <View className="h-px bg-border/40" />
      <Line label="Saldo final" value={summary.closing_balance} currency={currency} bold />
      <Text className="text-text-muted text-[11px]">
        {summary.count} {summary.count === 1 ? 'movimiento' : 'movimientos'} · cambios vs. {prevLabel}
      </Text>
    </View>
  );
}

function Line({
  label,
  value,
  currency,
  sign,
  tone,
  bold,
  change,
  goodWhenUp = false,
}: {
  label: string;
  value: string;
  currency: string;
  sign?: string;
  tone?: 'income' | 'expense';
  bold?: boolean;
  change?: number | null;
  goodWhenUp?: boolean;
}) {
  const changeColor =
    change == null || change === 0
      ? 'text-text-muted'
      : change > 0 === goodWhenUp
        ? 'text-income'
        : 'text-expense';
  return (
    <View className="flex-row items-center gap-2">
      <Text
        className="text-text flex-1 text-sm"
        style={{ fontFamily: bold ? fonts.semibold : undefined }}
        numberOfLines={1}
      >
        {sign ? `${sign} ` : ''}
        {label}
      </Text>
      {change != null ? (
        <Text className={`${changeColor} text-[11px]`}>
          {change > 0 ? '+' : ''}
          {change}%
        </Text>
      ) : null}
      <Money
        value={value}
        currency={currency}
        tone={tone}
        className={bold ? 'font-bold' : 'font-semibold'}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      />
    </View>
  );
}
