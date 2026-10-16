import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useCreditCardStatement, useStatementCycles, useWallet, useWallets } from '@/api/queries';
import type {
  PaymentGuidance,
  StatementCycle,
  StatementCycleStatus,
  StatementInstallmentLine,
  UnbilledActivity,
} from '@/api/types';
import { CycleTimeline } from '@/components/CycleTimeline';
import { PaymentHeadline } from '@/components/PaymentHeadline';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { hasExtraPayoff, monthlyInterest, spendableBalance } from '@/lib/cardPayment';
import { formatLongDate, formatShortDate, todayISO } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { formatMoney, toNumber } from '@/lib/money';
import { transferToHref } from '@/lib/prefill';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const STATUS: Record<StatementCycleStatus, { label: string; tone: 'income' | 'warning' | 'expense' | 'muted' }> = {
  paid: { label: 'Pagado', tone: 'income' },
  paid_late: { label: 'Pagado tarde', tone: 'warning' },
  minimum_paid: { label: 'Mínimo cubierto', tone: 'warning' },
  pending: { label: 'Pendiente', tone: 'warning' },
  overdue: { label: 'Vencido', tone: 'expense' },
  nothing_due: { label: 'Sin saldo', tone: 'muted' },
};

const EPS = 0.005;

/**
 * Estado de cuenta de una tarjeta, uno por corte (ver
 * `wallets/{id}/statement-cycles/` y `services.statement_cycle` en el
 * backend). Arriba, la respuesta a «¿cuánto pago hoy?» en una frase
 * (`guidance`), con la línea de tiempo del ciclo; abajo, cómo se llega al
 * total del estado:
 *
 *   saldo anterior + compras + cuotas del ciclo − pagos = total del estado
 *
 * Pagar el total del estado antes de la fecha límite evita intereses. «Pagar
 * todo» suma además lo comprado después del corte (sin adelantar cuotas a
 * plazo): deja la tarjeta al día por completo.
 */
export default function StatementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletQ = useWallet(id);
  const walletsQ = useWallets();
  const cyclesQ = useStatementCycles(id, 6);
  // Para el detalle de compras a plazo pendientes, a hoy.
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
  const guidance = cyclesQ.data?.guidance;
  const cycle = cycles[selected];
  const isLatest = selected === 0;
  const rate = wallet?.interest_rate ? toNumber(wallet.interest_rate) : null;

  function pay(amount: string, note: string) {
    if (!id) return;
    haptics.tap();
    router.push(transferToHref(walletsQ.data ?? [], id, { amount, note, date: todayISO() }));
  }
  const configure = () => router.push(`/wallet/${id}`);

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

            {isLatest && guidance ? (
              <TodayCard
                cycle={cycle}
                guidance={guidance}
                currency={currency}
                onPay={pay}
                onConfigure={configure}
              />
            ) : (
              <PastCycleCard cycle={cycle} currency={currency} />
            )}

            {isLatest && cyclesQ.data ? (
              <SplitCard cycle={cycle} unbilled={cyclesQ.data.unbilled} currency={currency} />
            ) : null}

            {isLatest && guidance && toNumber(guidance.payoff_today) > EPS ? (
              <PlannerCard
                guidance={guidance}
                currency={currency}
                rate={rate}
                spendable={spendableBalance(walletsQ.data ?? [], currency)}
                onPay={pay}
                onConfigure={configure}
              />
            ) : null}

            {!isLatest ? (
              <InterestCard cycle={cycle} currency={currency} hasRate={rate != null} onConfigure={configure} />
            ) : null}

            <DetailCard cycle={cycle} currency={currency} />

            {isLatest && (todayQ.data?.installment_lines.length ?? 0) > 0 ? (
              <Card title="Compras a plazo">
                <Text className="text-text-muted mb-1 text-xs">
                  Al comprar, el disponible baja por el total; pero a cada estado sólo entra una cuota.
                </Text>
                {todayQ.data!.installment_lines.map((line, i) => (
                  <InstallmentLineRow key={line.id} line={line} currency={currency} first={i === 0} />
                ))}
              </Card>
            ) : null}

            <Glossary />
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

function PayButton({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`h-10 flex-row items-center justify-center rounded-full px-4 active:opacity-70 ${
        primary ? '' : 'border border-border'
      }`}
      style={primary ? { backgroundColor: colors.primary } : undefined}
    >
      <Text
        className={primary ? 'text-sm' : 'text-text text-sm'}
        style={{ fontFamily: fonts.semibold, color: primary ? colors.primaryFg : undefined }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Hoy: la frase de qué pagar, la línea de tiempo del ciclo, cuánto se lleva
 * pagado del estado, el mínimo y «pagar todo». */
function TodayCard({
  cycle,
  guidance,
  currency,
  onPay,
  onConfigure,
}: {
  cycle: StatementCycle;
  guidance: PaymentGuidance;
  currency: string;
  onPay: (amount: string, note: string) => void;
  onConfigure: () => void;
}) {
  const balance = toNumber(cycle.statement_balance);
  const paid = toNumber(cycle.paid_since_cutoff);
  const remaining = toNumber(cycle.remaining);
  const minimum = cycle.minimum_payment != null ? toNumber(cycle.minimum_payment) : null;
  const minimumRemaining = cycle.minimum_remaining != null ? toNumber(cycle.minimum_remaining) : null;
  const payoff = toNumber(guidance.payoff_today);
  const extraPayoff = hasExtraPayoff(guidance);

  return (
    <Card>
      <PaymentHeadline guidance={guidance} currency={currency} />

      <View className="mt-4">
        <CycleTimeline
          cutoff={cycle.cutoff_date}
          due={cycle.payment_due_date}
          nextCutoff={guidance.next_cutoff_date}
          today={todayISO()}
        />
      </View>

      {balance > EPS ? (
        <View className="mt-4 gap-1.5">
          <View className="flex-row items-end justify-between">
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              {remaining > EPS ? 'Te falta' : 'Estado pagado'}
            </Text>
            <Text className="text-text-muted text-xs">
              {remaining > EPS ? (
                <>
                  <Money value={remaining} currency={currency} tone="expense" className="text-base font-bold" /> de{' '}
                </>
              ) : null}
              <Money value={balance} currency={currency} tone="muted" />
            </Text>
          </View>
          <ProgressBar progress={paid / balance} tone="income" />
          <Text className="text-text-muted text-xs">
            {paid > EPS ? (
              <>
                Llevas <Money value={paid} currency={currency} tone="muted" /> pagado desde el corte
                {cycle.status === 'paid_late' ? ' (llegó después de la fecha límite)' : ''}.
              </>
            ) : (
              'Todavía no registras pagos desde el corte.'
            )}
          </Text>
        </View>
      ) : null}

      {balance > EPS ? (
        minimum != null ? (
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-text-muted text-xs">
              {minimumRemaining && minimumRemaining > EPS
                ? 'Mínimo (evita el recargo, no los intereses)'
                : 'Mínimo cubierto ✓'}
            </Text>
            {minimumRemaining && minimumRemaining > EPS ? (
              <Money value={minimumRemaining} currency={currency} tone="warning" className="text-sm font-semibold" />
            ) : (
              <Money value={minimum} currency={currency} tone="muted" className="text-xs" />
            )}
          </View>
        ) : (
          <Pressable onPress={onConfigure} accessibilityRole="button" className="mt-3 active:opacity-60">
            <Text className="text-primary text-xs">Configura el pago mínimo de esta tarjeta →</Text>
          </Pressable>
        )
      ) : null}

      {extraPayoff ? (
        <View className="mt-3 gap-0.5 border-t border-border/30 pt-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              Para quedar al día por completo
            </Text>
            <Money value={payoff} currency={currency} className="text-sm font-semibold" />
          </View>
          <Text className="text-text-muted text-[11px]">
            Incluye lo comprado después del corte. No adelanta cuotas de compras a plazo.
          </Text>
        </View>
      ) : null}

      {remaining > EPS || extraPayoff ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {remaining > EPS ? (
            <PayButton primary label="Registrar pago" onPress={() => onPay(cycle.remaining, 'Pago de tarjeta')} />
          ) : null}
          {minimumRemaining && minimumRemaining > EPS && cycle.minimum_remaining !== cycle.remaining ? (
            <PayButton
              label="Pagar el mínimo"
              onPress={() => onPay(cycle.minimum_remaining!, 'Pago mínimo de tarjeta')}
            />
          ) : null}
          {extraPayoff ? (
            <PayButton
              primary={remaining <= EPS}
              label="Pagar todo"
              onPress={() => onPay(guidance.payoff_today, 'Pago total de tarjeta')}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Un estado anterior: su total, lo pagado y en qué quedó. */
function PastCycleCard({ cycle, currency }: { cycle: StatementCycle; currency: string }) {
  const colors = useColors();
  const status = STATUS[cycle.status];
  const balance = toNumber(cycle.statement_balance);
  const paid = toNumber(cycle.paid_since_cutoff);
  const remaining = toNumber(cycle.remaining);
  const statusColor =
    status.tone === 'income'
      ? colors.income
      : status.tone === 'expense'
        ? colors.expense
        : status.tone === 'warning'
          ? colors.warning
          : colors.textMuted;
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="text-text-muted text-xs">
          Corte del {formatLongDate(cycle.cutoff_date)}
          {cycle.payment_due_date ? ` · vencía el ${formatShortDate(cycle.payment_due_date)}` : ''}
        </Text>
        <View className="rounded-full bg-surface-2 px-2 py-0.5">
          <Text className="text-[10px] uppercase tracking-wide" style={{ color: statusColor }}>
            {status.label}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-end justify-between">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          Total del estado
        </Text>
        <Money value={balance} currency={currency} className="text-lg font-bold" />
      </View>
      {balance > EPS ? (
        <>
          <ProgressBar progress={paid / balance} tone="income" />
          <Text className="text-text-muted mt-1.5 text-xs">
            Pagado <Money value={paid} currency={currency} tone="muted" />
            {remaining > EPS ? (
              <>
                {' '}
                · quedó <Money value={remaining} currency={currency} tone="expense" /> sin pagar (pasó al estado
                siguiente)
              </>
            ) : null}
          </Text>
        </>
      ) : null}
    </Card>
  );
}

/** «Este estado» (se paga ahora) vs. «va al próximo estado». */
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
        <Text className="text-text-muted text-[11px] uppercase tracking-wide">Este estado</Text>
        <Money
          value={cycle.remaining}
          currency={currency}
          hideCurrency
          tone="expense"
          className="text-lg font-bold"
          numberOfLines={1}
          adjustsFontSizeToFit
        />
        <Text className="text-text-muted text-[11px]">
          {toNumber(cycle.remaining) > EPS
            ? cycle.payment_due_date
              ? `Falta pagar · vence ${formatShortDate(cycle.payment_due_date)}`
              : 'Falta pagar'
            : 'Pagado'}
        </Text>
      </View>
      <View className="flex-1 gap-1 rounded-3xl border border-border/60 bg-surface/95 p-3">
        <Text className="text-text-muted text-[11px] uppercase tracking-wide">Va al próximo estado</Text>
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
          Corte del {formatShortDate(unbilled.next_cutoff_date)}
          {toNumber(unbilled.installments_next) > EPS ? ' (incluye cuotas)' : ''}
        </Text>
      </View>
    </View>
  );
}

function parseAmount(text: string): number {
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** «¿Cuánto puedes pagar?»: elige un monto (mínimo / el estado / todo, o
 * cualquiera) y muestra qué pasa -- intereses de lo que quede y si te
 * alcanza con lo que tienes en tus cuentas de gasto. */
function PlannerCard({
  guidance,
  currency,
  rate,
  spendable,
  onPay,
  onConfigure,
}: {
  guidance: PaymentGuidance;
  currency: string;
  rate: number | null;
  spendable: number;
  onPay: (amount: string, note: string) => void;
  onConfigure: () => void;
}) {
  const colors = useColors();
  const remaining = toNumber(guidance.amount);
  const minimum = guidance.minimum_remaining != null ? toNumber(guidance.minimum_remaining) : null;
  const payoff = toNumber(guidance.payoff_today);
  const [text, setText] = useState(() => (remaining > EPS ? guidance.amount : guidance.payoff_today));
  const amount = parseAmount(text);

  const presets: { label: string; value: number }[] = [
    ...(minimum != null && minimum > EPS && minimum < remaining - EPS ? [{ label: 'Mínimo', value: minimum }] : []),
    ...(remaining > EPS ? [{ label: 'El estado', value: remaining }] : []),
    ...(hasExtraPayoff(guidance) ? [{ label: 'Todo', value: payoff }] : []),
  ];

  const leftover = Math.max(0, remaining - amount);
  const ahead = Math.max(0, amount - remaining);
  const interest = monthlyInterest(leftover, rate);
  const short = Math.max(0, amount - spendable);

  return (
    <Card title="¿Cuánto puedes pagar?">
      <View className="mb-3 flex-row flex-wrap gap-2">
        {presets.map((p) => {
          const active = Math.abs(p.value - amount) < EPS;
          return (
            <Pressable
              key={p.label}
              onPress={() => {
                haptics.selection();
                setText(p.value.toFixed(2));
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                active ? 'border-primary bg-primary' : 'border-border bg-surface-2'
              }`}
            >
              <Text className={active ? 'text-primary-fg text-xs font-semibold' : 'text-text-muted text-xs'}>
                {p.label} · {formatMoney(p.value, currency)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextField label="Monto a pagar" value={text} onChangeText={setText} keyboardType="decimal-pad" />

      <View className="mt-3 gap-1.5">
        {amount <= EPS ? null : leftover > EPS ? (
          <Text className="text-text-muted text-xs">
            Quedarían <Money value={leftover} currency={currency} tone="expense" /> del estado sin pagar
            {interest != null ? (
              <>
                {' '}
                ≈ <Money value={interest} currency={currency} tone="expense" /> de intereses el próximo mes
              </>
            ) : null}
            .{minimum != null && amount < minimum - EPS ? ' No cubre el mínimo: habrá recargo.' : ''}
          </Text>
        ) : (
          <Text className="text-xs" style={{ color: colors.income }}>
            Cubre el estado: no pagas intereses
            {ahead > EPS ? (
              <Text className="text-text-muted">
                {' '}
                · adelantas <Money value={ahead} currency={currency} tone="muted" /> del próximo estado
              </Text>
            ) : null}
            .
          </Text>
        )}
        {amount > EPS ? (
          <Text className="text-text-muted text-xs">
            En tus cuentas de gasto tienes <Money value={spendable} currency={currency} tone="muted" />
            {short > EPS ? (
              <>
                : te faltan <Money value={short} currency={currency} tone="expense" />.
              </>
            ) : (
              ': te alcanza.'
            )}
          </Text>
        ) : null}
        {rate == null && leftover > EPS ? (
          <Pressable onPress={onConfigure} accessibilityRole="button" className="active:opacity-60">
            <Text className="text-primary text-xs">Agrega la tasa de interés para estimar el costo →</Text>
          </Pressable>
        ) : null}
      </View>

      {amount > EPS ? (
        <View className="mt-3 flex-row">
          <PayButton label="Registrar este pago" onPress={() => onPay(amount.toFixed(2), 'Pago de tarjeta')} />
        </View>
      ) : null}
    </Card>
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
          Agrega la tasa de interés de la tarjeta para estimar cuánto costaría no pagar completo →
        </Text>
      </Pressable>
    );
  }
  return (
    <Card title="Intereses estimados">
      {cycle.interest_if_minimum != null ? (
        <InterestRow label="Si pagas sólo el mínimo" value={cycle.interest_if_minimum} currency={currency} first />
      ) : null}
      {cycle.interest_if_unpaid != null && toNumber(cycle.remaining) > 0.005 ? (
        <InterestRow
          label="Si no pagas lo que falta"
          value={cycle.interest_if_unpaid}
          currency={currency}
          first={cycle.interest_if_minimum == null}
        />
      ) : null}
      <Text className="text-text-muted mt-1 text-[11px]">
        Estimación de un mes con la tasa anual de la tarjeta. Pagando el total del estado antes de la
        fecha límite: 0.
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

/** El estado impreso: cómo se llega al total del estado. */
function DetailCard({ cycle, currency }: { cycle: StatementCycle; currency: string }) {
  const adjustments = toNumber(cycle.adjustments);
  return (
    <Card
      title="Cómo se llegó al total"
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
          Total del estado
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
    <View className={`gap-0.5 py-2.5 ${first ? '' : 'border-t border-border/30'}`}>
      <View className="flex-row items-center justify-between">
        <Text className="text-text flex-1 pr-2 text-sm" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {line.description}
        </Text>
        <Money value={line.next_installment_amount} currency={currency} className="text-sm font-semibold" />
      </View>
      <Text className="text-text-muted text-xs">
        Cuota del corte {formatShortDate(line.next_installment_cutoff)} · quedan {line.installments_pending} de{' '}
        {line.installments_total} (<Money value={line.amount_pending} currency={currency} tone="muted" /> en total)
      </Text>
    </View>
  );
}

const GLOSSARY: [string, string][] = [
  ['Corte', 'El día en que el banco cierra el estado: lo comprado hasta ahí se paga en la fecha límite.'],
  ['Fecha límite', 'Hasta cuándo puedes pagar el estado sin intereses ni recargo.'],
  ['Total del estado', 'Lo que debes del último corte. Pagarlo completo a tiempo = 0 intereses.'],
  ['Mínimo', 'Lo menos que puedes pagar para evitar el recargo por atraso. El resto sí genera intereses.'],
  ['Pagar todo', 'El estado + lo comprado después del corte, sin adelantar cuotas a plazo. Deja la tarjeta al día.'],
  ['Va al próximo estado', 'Lo comprado después del corte: se paga en la fecha límite del mes siguiente.'],
];

/** «¿Qué significa?»: las palabras del estado de cuenta, plegado por defecto. */
function Glossary() {
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-2">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="self-center active:opacity-60"
      >
        <Text className="text-primary text-xs">{open ? 'Ocultar' : '¿Qué significa cada cosa?'}</Text>
      </Pressable>
      {open ? (
        <Card>
          {GLOSSARY.map(([term, meaning], i) => (
            <View key={term} className={`gap-0.5 py-2 ${i === 0 ? '' : 'border-t border-border/20'}`}>
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                {term}
              </Text>
              <Text className="text-text-muted text-xs">{meaning}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
