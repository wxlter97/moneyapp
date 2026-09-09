import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useCreditCardStatement, useWallet } from '@/api/queries';
import type { StatementInstallmentLine } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { formatLongDate, formatShortDate, todayISO } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { fonts } from '@/theme/typography';

/**
 * Pago de contado de una tarjeta a la fecha elegida:
 *
 *   pago de contado = saldo usado (límite − disponible)
 *                   − capital a plazo que aún no vence
 *
 * Ver `services.credit_card_statement` en el backend.
 */
export default function StatementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [asOf, setAsOf] = useState(todayISO());

  const walletQ = useWallet(id);
  const stmtQ = useCreditCardStatement(id, asOf);
  const refresh = usePullRefresh(stmtQ.isFetching && !stmtQ.isLoading, () => {
    walletQ.refetch();
    stmtQ.refetch();
  });

  const wallet = walletQ.data;
  const data = stmtQ.data;
  const currency = wallet?.currency ?? 'USD';

  const notDue = data ? toNumber(data.installments_not_due) : 0;

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={wallet?.name ?? 'Pago de contado'} />
      <ScrollView contentContainerClassName="gap-4 py-2" refreshControl={refresh}>
        <DateField label="Consultar al" value={asOf} onChange={setAsOf} />

        {stmtQ.isLoading ? (
          <LoadingState />
        ) : stmtQ.isError ? (
          <ErrorState error={stmtQ.error} onRetry={stmtQ.refetch} />
        ) : !data ? null : (
          <>
            <Card className="items-center">
              <Text className="text-text-muted text-sm">Pago de contado</Text>
              <Money
                value={data.total_due}
                currency={currency}
                hero
                tone={toNumber(data.total_due) > 0.005 ? 'expense' : 'income'}
                className="text-4xl"
              />
              <Text className="text-text-muted mt-1 text-center text-xs">
                Corte del {formatLongDate(data.cutoff_date)}
                {data.payment_due_date ? ` · vence el ${formatShortDate(data.payment_due_date)}` : ''}
              </Text>
            </Card>

            <Card title="Cómo se calcula">
              {data.available != null ? (
                <>
                  <BreakdownRow label="Límite" value={data.credit_limit ?? 0} currency={currency} first />
                  <BreakdownRow label="Disponible" value={data.available} currency={currency} />
                </>
              ) : null}
              <BreakdownRow
                label="Saldo usado"
                value={data.used}
                currency={currency}
                tone="expense"
                strong
                first={data.available == null}
              />
              {notDue > 0.005 ? (
                <BreakdownRow
                  label="Compras a plazo que aún no vencen"
                  value={-notDue}
                  currency={currency}
                  tone="income"
                />
              ) : null}
              <View className="border-border/40 mt-1 flex-row items-center justify-between border-t pt-2.5">
                <Text className="text-text text-sm" style={{ fontFamily: fonts.bold }}>
                  Pago de contado
                </Text>
                <Money
                  value={data.total_due}
                  currency={currency}
                  tone={toNumber(data.total_due) > 0.005 ? 'expense' : 'income'}
                  className="text-sm font-bold"
                />
              </View>
            </Card>

            {data.installment_lines.length > 0 ? (
              <Card title="Cuotas pendientes">
                {data.installment_lines.map((line, i) => (
                  <InstallmentLineRow key={line.id} line={line} currency={currency} first={i === 0} />
                ))}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function BreakdownRow({
  label,
  value,
  currency,
  tone = 'default',
  first = false,
  strong = false,
}: {
  label: string;
  value: string | number;
  currency: string;
  tone?: 'default' | 'income' | 'expense';
  first?: boolean;
  strong?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-2 ${first ? '' : 'border-t border-border/20'}`}
    >
      <Text
        className="text-text-muted text-sm"
        style={strong ? { fontFamily: fonts.semibold } : undefined}
      >
        {label}
      </Text>
      <Money
        value={value}
        currency={currency}
        tone={tone}
        signed={tone !== 'default'}
        className={`text-sm ${strong ? 'font-semibold' : ''}`}
      />
    </View>
  );
}

function InstallmentLineRow({
  line,
  currency,
  first,
}: {
  line: StatementInstallmentLine;
  currency: string;
  first: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-2.5 ${first ? '' : 'border-t border-border/30'}`}
    >
      <View className="flex-1 pr-2">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {line.description}
        </Text>
        <Text className="text-text-muted text-xs">
          {line.installments_pending}/{line.installments_total} cuota
          {line.installments_pending === 1 ? '' : 's'} pendiente
          {line.installments_pending === 1 ? '' : 's'}
        </Text>
      </View>
      <Money value={line.amount_pending} currency={currency} className="text-sm font-semibold" />
    </View>
  );
}
