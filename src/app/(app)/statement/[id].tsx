import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useCreditCardStatement, useStatementCycles, useWallet, useWallets } from '@/api/queries';
import type {
  StatementCycle,
  StatementCycleStatus,
  StatementInstallmentLine,
  UnbilledActivity,
} from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { formatLongDate, formatShortDate, todayISO } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { transferToHref } from '@/lib/prefill';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const STATUS: Record<StatementCycleStatus, { label: string; tone: 'income' | 'warning' | 'expense' | 'muted' }> = {
  paid: { label: 'Pagado', tone: 'income' },
  minimum_paid: { label: 'Mínimo cubierto', tone: 'warning' },
  pending: { label: 'Pendiente', tone: 'warning' },
  overdue: { label: 'Vencido', tone: 'expense' },
  nothing_due: { label: 'Sin saldo', tone: 'muted' },
};

/**
 * Estado de cuenta de una tarjeta, uno por corte, como lo imprime el banco
 * (ver `wallets/{id}/statement-cycles/` y `services.statement_cycle` en el
 * backend):
 *
 *   saldo anterior + compras + cuotas del ciclo − pagos = saldo al corte
 *
 * El saldo al corte es el PAGO DE CONTADO: pagándolo antes de la fecha
 * límite no hay intereses. Las compras hechas después del corte van al
 * próximo estado ("después del corte"), no se pagan ahora.
 */
export default function StatementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletQ = useWallet(id);
  const walletsQ = useWallets();
  const cyclesQ = useStatementCycles(id, 6);
  // Sólo para el detalle de cuotas pendientes (compras a plazo), a hoy.
  const todayQ = useCreditCardStatement(id);
  const [selected, setSelected] = useState(0);

  const refresh = usePullRefresh(cyclesQ.isFetching && !cyclesQ.isLoading, () => {
    void walletQ.refetch();
    void cyclesQ.refetch();
    void todayQ.refetch();
  });

  const wallet = walletQ.data;
  const currency = wallet?.currency ?? 'USD';
  const cycles = cyclesQ.data?.cycles ?? [];
  const cycle = cycles[selected];
  const isLatest = selected === 0;

  function pay(amount: string, note: string) {
    if (!id) return;
    haptics.tap();
    router.push(transferToHref(walletsQ.data ?? [], id, { amount, note, date: todayISO() }));
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={wallet?.name ?? 'Estado de cuenta'} />
      <ScrollView contentContainerClassName="gap-4 py-2" refreshControl={refresh}>
        {cyclesQ.isLoading ? (
          <LoadingState />
        ) : cyclesQ.isError ? (
          <ErrorState error={cyclesQ.error} onRetry={cyclesQ.refetch} />
        ) : !cycle ? null : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {cycles.map((c, i) => (
                <CycleChip
                  key={c.cutoff_date}
                  cycle={c}
                  active={i === selected}
                  latest={i === 0}
                  onPress={() => {
                    haptics.selection();
                    setSelected(i);
                  }}
                />
              ))}
            </ScrollView>

            <PaymentCard
              cycle={cycle}
              currency={currency}
              isLatest={isLatest}
              onPay={pay}
              onConfigure={() => router.push(`/wallet/${id}`)}
            />

            {isLatest && cyclesQ.data ? (
              <SplitCard cycle={cycle} unbilled={cyclesQ.data.unbilled} currency={currency} />
            ) : null}

            <InterestCard
              cycle={cycle}
              currency={currency}
              hasRate={!!wallet?.interest_rate}
              onConfigure={() => router.push(`/wallet/${id}`)}
            />

            <DetailCard cycle={cycle} currency={currency} />

            {isLatest && (todayQ.data?.installment_lines.length ?? 0) > 0 ? (
              <Card title="Compras a plazo pendientes">
                {todayQ.data!.installment_lines.map((line, i) => (
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

function CycleChip({
  cycle,
  active,
  latest,
  onPress,
}: {
  cycle: StatementCycle;
  active: boolean;
  latest: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const dot =
    cycle.status === 'overdue'
      ? colors.expense
      : cycle.status === 'paid' || cycle.status === 'nothing_due'
        ? colors.income
        : colors.warning;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Corte del ${formatLongDate(cycle.cutoff_date)}, ${STATUS[cycle.status].label}`}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-70 ${
        active ? 'border-primary bg-primary' : 'border-border bg-surface-2'
      }`}
    >
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
      <Text className={active ? 'text-primary-fg text-xs font-semibold' : 'text-text-muted text-xs'}>
        {latest ? 'Último · ' : ''}
        {formatShortDate(cycle.cutoff_date)}
      </Text>
    </Pressable>
  );
}

/** Pago de contado vs. mínimo, cada uno con cuánto ya se pagó desde el corte. */
function PaymentCard({
  cycle,
  currency,
  isLatest,
  onPay,
  onConfigure,
}: {
  cycle: StatementCycle;
  currency: string;
  isLatest: boolean;
  onPay: (amount: string, note: string) => void;
  onConfigure: () => void;
}) {
  const colors = useColors();
  const status = STATUS[cycle.status];
  const balance = toNumber(cycle.statement_balance);
  const paid = toNumber(cycle.paid_since_cutoff);
  const remaining = toNumber(cycle.remaining);
  const minimum = cycle.minimum_payment != null ? toNumber(cycle.minimum_payment) : null;
  const minimumRemaining = cycle.minimum_remaining != null ? toNumber(cycle.minimum_remaining) : null;
  const statusColor =
    status.tone === 'income'
      ? colors.income
      : status.tone === 'expense'
        ? colors.expense
        : status.tone === 'warning'
          ? colors.warning
          : colors.textMuted;
  const canPay = isLatest && remaining > 0.005;

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="text-text-muted text-xs">
          Corte del {formatLongDate(cycle.cutoff_date)}
          {cycle.payment_due_date ? ` · pagar antes del ${formatShortDate(cycle.payment_due_date)}` : ''}
        </Text>
        <View className="rounded-full bg-surface-2 px-2 py-0.5">
          <Text className="text-[10px] uppercase tracking-wide" style={{ color: statusColor }}>
            {status.label}
          </Text>
        </View>
      </View>

      <View className="mt-3 gap-1.5">
        <View className="flex-row items-end justify-between">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            Pago de contado
          </Text>
          <Money value={balance} currency={currency} className="text-lg font-bold" />
        </View>
        <ProgressBar progress={balance > 0 ? paid / balance : 1} tone="income" />
        <Text className="text-text-muted text-xs">
          {remaining > 0.005 ? (
            <>
              Pagado <Money value={paid} currency={currency} tone="muted" /> · falta{' '}
              <Money value={remaining} currency={currency} tone="expense" className="font-semibold" />
            </>
          ) : balance > 0 ? (
            'Pagado completo: no genera intereses.'
          ) : (
            'Nada que pagar en este corte.'
          )}
        </Text>
      </View>

      {minimum != null ? (
        <View className="mt-4 gap-1.5">
          <View className="flex-row items-end justify-between">
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              Pago mínimo
            </Text>
            <Money value={minimum} currency={currency} className="text-base font-semibold" />
          </View>
          <ProgressBar progress={minimum > 0 ? paid / minimum : 1} />
          <Text className="text-text-muted text-xs">
            {minimumRemaining && minimumRemaining > 0.005 ? (
              <>
                Falta <Money value={minimumRemaining} currency={currency} tone="warning" /> para cubrir el
                mínimo. Pagar sólo el mínimo evita el recargo, no los intereses.
              </>
            ) : (
              'Mínimo cubierto.'
            )}
          </Text>
        </View>
      ) : (
        <Pressable onPress={onConfigure} accessibilityRole="button" className="mt-3 active:opacity-60">
          <Text className="text-primary text-xs">Configurá el pago mínimo de esta tarjeta →</Text>
        </Pressable>
      )}

      {canPay ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => onPay(cycle.remaining, 'Pago de tarjeta')}
            accessibilityRole="button"
            className="h-10 flex-row items-center justify-center rounded-full px-4 active:opacity-70"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-sm" style={{ fontFamily: fonts.semibold, color: colors.primaryFg }}>
              Registrar pago
            </Text>
          </Pressable>
          {minimumRemaining && minimumRemaining > 0.005 && cycle.minimum_remaining !== cycle.remaining ? (
            <Pressable
              onPress={() => onPay(cycle.minimum_remaining!, 'Pago mínimo de tarjeta')}
              accessibilityRole="button"
              className="h-10 flex-row items-center justify-center rounded-full border border-border px-4 active:opacity-70"
            >
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                Pagar el mínimo
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** "Del corte" (se paga ahora) vs. "después del corte" (va al próximo estado). */
function SplitCard({
  cycle,
  unbilled,
  currency,
}: {
  cycle: StatementCycle;
  unbilled: UnbilledActivity;
  currency: string;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="flex-1 gap-1 rounded-3xl border border-border/60 bg-surface/95 p-3">
        <Text className="text-text-muted text-[11px] uppercase tracking-wide">Del corte</Text>
        <Money
          value={cycle.remaining}
          currency={currency}
          hideCurrency
          tone="expense"
          className="text-lg font-bold"
          numberOfLines={1}
          adjustsFontSizeToFit
        />
        <Text className="text-text-muted text-[11px]">Se paga ahora</Text>
      </View>
      <View className="flex-1 gap-1 rounded-3xl border border-border/60 bg-surface/95 p-3">
        <Text className="text-text-muted text-[11px] uppercase tracking-wide">Después del corte</Text>
        <Money
          value={unbilled.total}
          currency={currency}
          hideCurrency
          tone="muted"
          className="text-lg font-bold"
          numberOfLines={1}
          adjustsFontSizeToFit
        />
        <Text className="text-text-muted text-[11px]">
          Va al corte del {formatShortDate(unbilled.next_cutoff_date)}
          {toNumber(unbilled.installments_next) > 0.005 ? ' (incluye cuotas)' : ''}
        </Text>
      </View>
    </View>
  );
}

function InterestCard({
  cycle,
  currency,
  hasRate,
  onConfigure,
}: {
  cycle: StatementCycle;
  currency: string;
  hasRate: boolean;
  onConfigure: () => void;
}) {
  if (toNumber(cycle.statement_balance) <= 0.005) return null;
  if (!hasRate) {
    return (
      <Pressable onPress={onConfigure} accessibilityRole="button" className="active:opacity-60">
        <Text className="text-primary text-center text-xs">
          Agregá la tasa de interés de la tarjeta para estimar cuánto costaría no pagar completo →
        </Text>
      </Pressable>
    );
  }
  return (
    <Card title="Intereses estimados">
      {cycle.interest_if_minimum != null ? (
        <InterestRow label="Si pagás sólo el mínimo" value={cycle.interest_if_minimum} currency={currency} first />
      ) : null}
      {cycle.interest_if_unpaid != null && toNumber(cycle.remaining) > 0.005 ? (
        <InterestRow
          label="Si no pagás lo que falta"
          value={cycle.interest_if_unpaid}
          currency={currency}
          first={cycle.interest_if_minimum == null}
        />
      ) : null}
      <Text className="text-text-muted mt-1 text-[11px]">
        Estimación de un mes con la tasa anual de la tarjeta. Pagando el contado antes de la fecha
        límite: 0.
      </Text>
    </Card>
  );
}

function InterestRow({
  label,
  value,
  currency,
  first,
}: {
  label: string;
  value: string;
  currency: string;
  first: boolean;
}) {
  return (
    <View className={`flex-row items-center justify-between py-2 ${first ? '' : 'border-t border-border/20'}`}>
      <Text className="text-text-muted text-sm">{label}</Text>
      <Money value={value} currency={currency} tone="expense" className="text-sm font-semibold" />
    </View>
  );
}

/** El estado impreso: cómo se llega al saldo al corte. */
function DetailCard({ cycle, currency }: { cycle: StatementCycle; currency: string }) {
  const adjustments = toNumber(cycle.adjustments);
  return (
    <Card
      title="Detalle del estado"
      action={
        <Text className="text-text-muted text-[11px]">
          {formatShortDate(cycle.period_start)} – {formatShortDate(cycle.cutoff_date)}
        </Text>
      }
    >
      <BreakdownRow label="Saldo anterior" value={cycle.previous_balance} currency={currency} first />
      <BreakdownRow label="Pagos del período" value={-toNumber(cycle.payments)} currency={currency} tone="income" />
      <BreakdownRow label="Compras y cargos" value={cycle.purchases} currency={currency} tone="expense" />
      {toNumber(cycle.installments_charged) > 0.005 ? (
        <BreakdownRow
          label="Cuotas del período"
          value={cycle.installments_charged}
          currency={currency}
          tone="expense"
        />
      ) : null}
      {Math.abs(adjustments) > 0.005 ? (
        <BreakdownRow label="Ajustes" value={adjustments} currency={currency} tone="expense" />
      ) : null}
      <View className="border-border/40 mt-1 flex-row items-center justify-between border-t pt-2.5">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.bold }}>
          Saldo al corte
        </Text>
        <Money value={cycle.statement_balance} currency={currency} className="text-sm font-bold" />
      </View>
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
    <View className={`flex-row items-center justify-between py-2 ${first ? '' : 'border-t border-border/20'}`}>
      <Text className="text-text-muted text-sm">{label}</Text>
      <Money value={value} currency={currency} tone={tone} signed={tone !== 'default'} className="text-sm" />
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
