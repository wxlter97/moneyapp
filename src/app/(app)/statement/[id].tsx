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
 * Estado de cuenta de una tarjeta a una fecha elegible: cuánto hay que
 * transferir para estar al día (Fase 3 del roadmap). Ver
 * `services.credit_card_statement` en el backend para la fórmula exacta.
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

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={wallet?.name ?? 'Estado de cuenta'} />
      <ScrollView contentContainerClassName="gap-4 py-2" refreshControl={refresh}>
        <DateField label="Consultar al" value={asOf} onChange={setAsOf} />

        {stmtQ.isLoading ? (
          <LoadingState />
        ) : stmtQ.isError ? (
          <ErrorState error={stmtQ.error} onRetry={stmtQ.refetch} />
        ) : !data ? null : (
          <>
            <TotalDueCard totalDue={toNumber(data.total_due)} currency={currency}>
              <Text className="text-text-muted mt-1 text-center text-xs">
                Corte del {formatLongDate(data.cutoff_date)}
                {data.payment_due_date ? ` · vence el ${formatShortDate(data.payment_due_date)}` : ''}
              </Text>
            </TotalDueCard>

            <Card title="Cómo se calcula">
              <BreakdownRow
                label="Gastos del período"
                value={data.spent}
                currency={currency}
                tone="expense"
                first
              />
              <BreakdownRow
                label="Cuotas de compras a plazo"
                value={data.installments_due}
                currency={currency}
                tone="expense"
              />
              <BreakdownRow
                label="Abonos hechos"
                value={-toNumber(data.paid)}
                currency={currency}
                tone="income"
              />
              <View className="border-border/40 mt-1 flex-row items-center justify-between border-t pt-2.5">
                <Text className="text-text text-sm" style={{ fontFamily: fonts.bold }}>
                  Total a pagar
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
              <Card title="Compras a plazo que suman">
                {data.installment_lines.map((line, i) => (
                  <InstallmentLineRow key={line.id} line={line} currency={currency} first={i === 0} />
                ))}
              </Card>
            ) : null}

            <Card title="Próximo corte">
              <Text className="text-text-muted text-sm">
                Llevas{' '}
                <Money value={data.current_period_spent} currency={currency} className="text-sm font-semibold" />{' '}
                acumulado desde el {formatShortDate(data.cutoff_date)}
                {toNumber(data.current_period_paid) > 0.005 ? (
                  <>
                    {' '}
                    (ya abonaste{' '}
                    <Money value={data.current_period_paid} currency={currency} className="text-sm font-semibold" />{' '}
                    por adelantado)
                  </>
                ) : null}
                , se cobrará en el corte del {formatShortDate(data.next_cutoff_date)}.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function TotalDueCard({
  totalDue,
  currency,
  children,
}: {
  totalDue: number;
  currency: string;
  children: React.ReactNode;
}) {
  const upToDate = totalDue <= 0.005 && totalDue >= -0.005;
  const inFavor = totalDue < -0.005;

  return (
    <Card className="items-center">
      <Text className="text-text-muted text-sm">
        {inFavor ? 'Tienes un saldo a favor de' : 'Debes'}
      </Text>
      {upToDate ? (
        <Text className="text-income mt-1 text-3xl" style={{ fontFamily: fonts.extrabold }}>
          Estás al día 🎉
        </Text>
      ) : (
        <Money
          value={Math.abs(totalDue)}
          currency={currency}
          hero
          tone={inFavor ? 'income' : 'expense'}
          className="text-4xl"
        />
      )}
      {children}
    </Card>
  );
}

function BreakdownRow({
  label,
  value,
  currency,
  tone = 'default',
  first = false,
}: {
  label: string;
  value: string | number;
  currency: string;
  tone?: 'default' | 'income' | 'expense';
  first?: boolean;
}) {
  return (
    <View className={`flex-row items-center justify-between py-2 ${first ? '' : ''}`}>
      <Text className="text-text-muted text-sm">{label}</Text>
      <Money value={value} currency={currency} tone={tone} signed className="text-sm font-semibold" />
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
          {line.installments_due}/{line.installments_total} cuotas vencidas
        </Text>
      </View>
      <Money value={line.amount_due} currency={currency} className="text-sm font-semibold" />
    </View>
  );
}
