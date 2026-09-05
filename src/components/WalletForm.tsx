import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  useArchiveWallet,
  useBankEmailSchemas,
  useCreateWallet,
  useDeleteWallet,
  useGoalProjection,
  useUnarchiveWallet,
  useUpdateWallet,
  useWallet,
  useWallets,
} from '@/api/queries';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { WalletInput, WalletKind, WalletPurpose } from '@/api/types';
import { dismissModal } from '@/components/ui/ModalHeader';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { muteColor } from '@/theme/accents';
import { fonts } from '@/theme/typography';
import { CURRENCIES } from '@/lib/currency';
import { formatYearMonth } from '@/lib/date';
import { formatMoney, toNumber } from '@/lib/money';
import { WALLET_COLORS } from '@/lib/wallets';

interface WalletFormProps {
  walletId?: string;
}

const PURPOSE_OPTIONS: { value: WalletPurpose; label: string }[] = [
  { value: 'spending', label: 'Gasto' },
  { value: 'savings', label: 'Ahorro' },
  { value: 'debt', label: 'Deuda' },
  { value: 'asset', label: 'Activo' },
];

const KIND_OPTIONS: { value: WalletKind; label: string }[] = [
  { value: 'bank', label: 'Banco' },
  { value: 'credit', label: 'Crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'custom', label: 'Otro' },
];

export function WalletForm({ walletId }: WalletFormProps) {
  const colors = useColors();
  const editing = !!walletId;
  const existing = useWallet(walletId);
  const walletsQ = useWallets();
  const create = useCreateWallet();
  const update = useUpdateWallet();
  const remove = useDeleteWallet();
  const archive = useArchiveWallet();
  const unarchive = useUnarchiveWallet();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [purpose, setPurpose] = useState<WalletPurpose>('spending');
  const [kind, setKind] = useState<WalletKind>('bank');
  const [color, setColor] = useState('');
  const [creditLimit, setCreditLimit] = useState('0.00');
  const [isArchived, setIsArchived] = useState(false);
  const [amount, setAmount] = useState('0.00');
  const [debtOwedToUs, setDebtOwedToUs] = useState(false); // deuda: "me deben"
  const [parentId, setParentId] = useState<string | null>(null);
  const [countsNet, setCountsNet] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [goalAmount, setGoalAmount] = useState('0.00');
  const [goalDate, setGoalDate] = useState('');
  const [monthly, setMonthly] = useState('0.00');
  const [debtTotal, setDebtTotal] = useState('0.00');
  const [interestRate, setInterestRate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [bankSchemaId, setBankSchemaId] = useState<string | null>(null);
  const [billingDay, setBillingDay] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!editing || prefilled || !existing.data) return;
    const w = existing.data;
    setName(w.name);
    setCurrency(w.currency);
    setPurpose(w.purpose);
    setKind(w.kind);
    setColor(w.color ?? '');
    setCreditLimit(w.credit_limit ? toNumber(w.credit_limit).toFixed(2) : '0.00');
    setIsArchived(w.is_archived);
    const bal = toNumber(w.opening_balance);
    setDebtOwedToUs(w.purpose === 'debt' && bal > 0);
    setAmount(Math.abs(bal).toFixed(2));
    setParentId(w.parent);
    setCountsNet(w.counts_toward_net_worth);
    setIsDefault(w.is_default);
    setGoalAmount(w.goal_amount ? toNumber(w.goal_amount).toFixed(2) : '0.00');
    setGoalDate(w.goal_date ?? '');
    setMonthly(w.monthly_contribution ? toNumber(w.monthly_contribution).toFixed(2) : '0.00');
    setDebtTotal(w.purpose === 'debt' && w.goal_amount ? toNumber(w.goal_amount).toFixed(2) : '0.00');
    setInterestRate(w.interest_rate ? toNumber(w.interest_rate).toString() : '');
    setDueDate(w.due_date ?? '');
    setCardLast4(w.card_last4 ?? '');
    setBankSchemaId(w.bank_schema);
    setBillingDay(w.billing_cycle_day ? String(w.billing_cycle_day) : '');
    setPaymentDueDay(w.payment_due_day ? String(w.payment_due_day) : '');
    setCounterparty(w.counterparty ?? '');
    setPrefilled(true);
  }, [editing, prefilled, existing.data]);

  const parentOptions = useMemo(
    () =>
      (walletsQ.data ?? [])
        .filter((w) => w.id !== walletId && w.purpose === purpose)
        .map((w) => ({ value: w.id, label: w.name })),
    [walletsQ.data, walletId, purpose],
  );

  const bankSchemasQ = useBankEmailSchemas();
  const bankOptions = useMemo(
    () => (bankSchemasQ.data ?? []).map((b) => ({ value: b.id, label: b.bank_name })),
    [bankSchemasQ.data],
  );

  const isDebt = purpose === 'debt';
  const isSavings = purpose === 'savings';
  // Campos de tarjeta: sólo tienen sentido según el SUBTIPO (`kind`), no el
  // `purpose` -- una cartera de efectivo o "personalizada" no tiene número
  // ni fechas de corte, sea de gasto o de deuda; y el corte/pago de tarjeta
  // sólo aplica a `kind=credit` (es lo único que soporta el estado de
  // cuenta en el backend).
  const cardNumberEligible = kind === 'bank' || kind === 'credit';
  const cardStatementEligible = kind === 'credit';

  function parseDay(value: string): number | null {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n >= 1 && n <= 31 ? n : null;
  }
  const amountNum = toNumber(amount);
  // Deuda: `amount` es lo PENDIENTE (fuente de verdad, como en el resto de
  // la app); lo "aportado" se deriva de `total - pendiente` para mostrar, y
  // es editable en el otro sentido (ver `onChangeAportado`) -- cálculo
  // bidireccional sin duplicar estado.
  const aportadoValue =
    isDebt && toNumber(debtTotal) > 0
      ? Math.max(0, toNumber(debtTotal) - amountNum).toFixed(2)
      : '0.00';

  function onChangeAportado(text: string) {
    const total = toNumber(debtTotal);
    setAmount(Math.max(0, total - toNumber(text)).toFixed(2));
  }

  const busy =
    create.isPending ||
    update.isPending ||
    remove.isPending ||
    archive.isPending ||
    unarchive.isPending;
  const canSubmit = name.trim().length > 0 && !busy;

  function onChangePurpose(next: WalletPurpose) {
    setPurpose(next);
    setParentId(null);
    if (next === 'debt') setKind('credit');
    else if (next === 'spending') setKind('bank');
  }

  async function onToggleArchive() {
    if (!walletId) return;
    setFormError(null);
    try {
      if (isArchived) await unarchive.mutateAsync(walletId);
      else await archive.mutateAsync(walletId);
      dismissModal();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo cambiar el archivado.'));
    }
  }

  async function onSubmit() {
    setFormError(null);
    setFields({});

    const signed = isDebt && !debtOwedToUs ? -amountNum : amountNum;
    const goalAmountValue = isSavings
      ? toNumber(goalAmount) > 0
        ? toNumber(goalAmount).toFixed(2)
        : null
      : isDebt && toNumber(debtTotal) > 0
        ? toNumber(debtTotal).toFixed(2)
        : null;
    const payload: WalletInput = {
      name: name.trim(),
      // Sólo al crear: cambiarla después dejaría el saldo ya acumulado (y
      // las transacciones ya registradas) en la moneda vieja, sin convertir.
      ...(!editing && { currency }),
      purpose,
      kind,
      color: color || '',
      parent: parentId || null,
      opening_balance: signed.toFixed(2),
      counts_toward_net_worth: countsNet,
      credit_limit:
        kind === 'credit' && toNumber(creditLimit) > 0
          ? toNumber(creditLimit).toFixed(2)
          : null,
      is_default: isDefault,
      goal_amount: goalAmountValue,
      goal_date: isSavings && goalDate ? goalDate : null,
      monthly_contribution:
        isSavings && toNumber(monthly) > 0 ? toNumber(monthly).toFixed(2) : null,
      interest_rate: isDebt && interestRate.trim() ? toNumber(interestRate).toFixed(2) : null,
      due_date: isDebt && dueDate ? dueDate : null,
      card_last4: cardNumberEligible && cardLast4.trim() ? cardLast4.trim() : null,
      bank_schema: cardNumberEligible ? bankSchemaId || null : null,
      billing_cycle_day: cardStatementEligible ? parseDay(billingDay) : null,
      payment_due_day: cardStatementEligible ? parseDay(paymentDueDay) : null,
      counterparty: isDebt ? counterparty.trim() : '',
    };

    try {
      if (editing) await update.mutateAsync({ id: walletId!, input: payload });
      else await create.mutateAsync(payload);
      dismissModal();
    } catch (err) {
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo guardar la cartera.'));
    }
  }

  async function onDelete() {
    if (!walletId) return;
    try {
      await remove.mutateAsync(walletId);
      dismissModal();
    } catch (err) {
      setConfirmingDelete(false);
      setFormError(
        errorMessage(err, 'No se pudo eliminar (¿tiene sub-carteras o movimientos?).'),
      );
    }
  }

  if (editing && existing.isLoading) return <LoadingState />;

  const amountLabel = isDebt
    ? debtOwedToUs
      ? 'Cuánto te deben'
      : 'Cuánto debes'
    : purpose === 'asset'
      ? 'Valor actual'
      : 'Saldo inicial';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        <TextField
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Cuenta corriente, Fondo de emergencias…"
          error={fields.name}
        />

        {!editing ? (
          <Select
            label="Moneda"
            value={currency}
            onChange={setCurrency}
            options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
          />
        ) : (
          <Text className="text-text-muted text-xs">
            Moneda: {currency} (no se puede cambiar después de crear la cartera)
          </Text>
        )}

        {!editing ? (
          <View className="gap-1.5">
            <Text className="text-text-muted text-sm">Tipo</Text>
            <Segmented value={purpose} onChange={onChangePurpose} options={PURPOSE_OPTIONS} />
          </View>
        ) : null}

        <View className="gap-1.5">
          <Text className="text-text-muted text-sm">Subtipo</Text>
          <Segmented value={kind} onChange={setKind} options={KIND_OPTIONS} />
        </View>

        <View className="gap-1.5">
          <Text className="text-text-muted text-sm">Color</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 py-1"
            keyboardShouldPersistTaps="handled"
          >
            {WALLET_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  haptics.selection();
                  setColor(color === c ? '' : c);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Color ${c}`}
                className={`h-9 w-9 items-center justify-center rounded-full ${
                  color === c ? 'border-2 border-text' : ''
                }`}
                style={{ backgroundColor: muteColor(c) ?? c }}
              >
                {color === c ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {kind === 'credit' ? (
          <AmountInput
            label="Límite de crédito (opcional)"
            value={creditLimit}
            onChangeText={setCreditLimit}
          />
        ) : null}

        {isDebt ? (
          <>
            <Segmented
              value={debtOwedToUs ? 'favor' : 'contra'}
              onChange={(v) => setDebtOwedToUs(v === 'favor')}
              options={[
                { value: 'contra', label: 'Debo' },
                { value: 'favor', label: 'Me deben' },
              ]}
            />
            <AmountInput
              label="Monto total de la deuda"
              value={debtTotal}
              onChangeText={setDebtTotal}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <AmountInput
                  label={debtOwedToUs ? 'Falta que te paguen' : 'Te falta pagar'}
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
              <View className="flex-1">
                <AmountInput
                  label={debtOwedToUs ? 'Ya te pagaron' : 'Ya pagaste'}
                  value={aportadoValue}
                  onChangeText={onChangeAportado}
                />
              </View>
            </View>
          </>
        ) : (
          <AmountInput label={amountLabel} value={amount} onChangeText={setAmount} />
        )}

        {parentOptions.length > 0 ? (
          <Select
            label="Cartera padre (opcional)"
            value={parentId}
            onChange={setParentId}
            options={[{ value: '', label: 'Ninguna' }, ...parentOptions]}
            placeholder="Ninguna"
          />
        ) : null}

        {isSavings ? (
          <>
            <AmountInput label="Meta (opcional)" value={goalAmount} onChangeText={setGoalAmount} />
            {toNumber(goalAmount) > 0 ? (
              <DateField label="Fecha objetivo (opcional)" value={goalDate || '2026-12-31'} onChange={setGoalDate} />
            ) : null}
            <AmountInput
              label="Aportación mensual (opcional)"
              value={monthly}
              onChangeText={setMonthly}
            />
            {/* Proyección contra el historial REAL guardado -- no contra lo que
                se esté tipeando ahora mismo sin guardar todavía. */}
            {editing && existing.data?.purpose === 'savings' && existing.data?.goal_amount ? (
              <GoalProjectionCard walletId={walletId!} currency={existing.data.currency} />
            ) : null}
          </>
        ) : null}

        {isDebt ? (
          <>
            <TextField
              label="Tasa de interés % anual (opcional)"
              value={interestRate}
              onChangeText={(t) => setInterestRate(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="12.5"
            />
            <DateField
              label="Fecha de vencimiento (opcional)"
              value={dueDate || '2026-12-31'}
              onChange={setDueDate}
            />
            <TextField
              label="Persona / entidad (opcional)"
              value={counterparty}
              onChangeText={setCounterparty}
            />
            {/* Proyección contra el historial REAL guardado -- no contra lo
                que se esté tipeando ahora mismo sin guardar todavía. */}
            {editing && existing.data?.purpose === 'debt' && existing.data?.goal_amount ? (
              <GoalProjectionCard walletId={walletId!} currency={existing.data.currency} debt />
            ) : null}
          </>
        ) : null}

        {cardNumberEligible ? (
          <>
            <TextField
              label="Últimos 4 dígitos (tarjeta, opcional)"
              value={cardLast4}
              onChangeText={(t) => setCardLast4(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="4242"
            />
            {bankOptions.length > 0 ? (
              <Select
                label="Banco (opcional)"
                value={bankSchemaId}
                onChange={setBankSchemaId}
                options={[{ value: '', label: 'Sin especificar' }, ...bankOptions]}
                placeholder="Sin especificar"
              />
            ) : null}
          </>
        ) : null}

        {cardStatementEligible ? (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label="Día de corte (opcional)"
                  value={billingDay}
                  onChangeText={(t) => setBillingDay(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="15"
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Día de pago (opcional)"
                  value={paymentDueDay}
                  onChangeText={(t) => setPaymentDueDay(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="5"
                />
              </View>
            </View>
            {editing && existing.data?.billing_cycle_day ? (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  router.push(`/statement/${walletId}`);
                }}
                className="flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                  Ver estado de cuenta
                </Text>
                <Icon name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </>
        ) : null}

        <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            Cuenta para el patrimonio neto
          </Text>
          <Switch
            value={countsNet}
            onValueChange={(v) => {
              haptics.tap();
              setCountsNet(v);
            }}
            trackColor={{ true: colors.primary, false: colors.surface2 }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            Preseleccionar al crear transacciones
          </Text>
          <Switch
            value={isDefault}
            onValueChange={(v) => {
              haptics.tap();
              setIsDefault(v);
            }}
            trackColor={{ true: colors.primary, false: colors.surface2 }}
            thumbColor="#FFFFFF"
          />
        </View>

        {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

        <Button
          label={editing ? 'Guardar cambios' : 'Crear cartera'}
          loading={create.isPending || update.isPending}
          disabled={!canSubmit}
          onPress={onSubmit}
        />

        {editing && !confirmingDelete ? (
          <View className="items-center gap-3 py-2">
            <Pressable
              onPress={() => {
                haptics.tap();
                onToggleArchive();
              }}
              disabled={busy}
              className="active:opacity-60"
              accessibilityRole="button"
            >
              <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                {isArchived ? 'Desarchivar cartera' : 'Archivar cartera'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.tap();
                setConfirmingDelete(true);
              }}
              disabled={busy}
              className="active:opacity-60"
              accessibilityRole="button"
            >
              <Text className="text-expense text-sm" style={{ fontFamily: fonts.semibold }}>
                Eliminar cartera
              </Text>
            </Pressable>
          </View>
        ) : null}

        {editing && confirmingDelete ? (
          <View className="gap-2 rounded-2xl bg-expense/10 p-3">
            <Text className="text-text text-sm">¿Eliminar esta cartera?</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => setConfirmingDelete(false)}
                />
              </View>
              <View className="flex-1">
                <Button label="Eliminar" loading={remove.isPending} onPress={onDelete} />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** "A este ritmo la alcanzás / la saldás en N meses" -- ver
 * `services.goal_projection` en el backend (para deudas, ya incorpora el
 * interés vía amortización). Silenciosa mientras carga o si falla: no es
 * crítico para poder seguir editando la cartera. */
function GoalProjectionCard({
  walletId,
  currency,
  debt = false,
}: {
  walletId: string;
  currency: string;
  debt?: boolean;
}) {
  const q = useGoalProjection(walletId, true);
  const data = q.data;
  if (q.isLoading || q.isError || !data) return null;

  if (data.months_to_goal === 0) {
    return (
      <View className="bg-surface-2 rounded-2xl px-4 py-3">
        <Text className="text-income text-sm" style={{ fontFamily: fonts.semibold }}>
          {debt ? '🎉 ¡Ya la saldaste!' : '🎉 ¡Ya alcanzaste tu meta!'}
        </Text>
      </View>
    );
  }

  if (data.months_to_goal == null) {
    return (
      <View className="bg-surface-2 rounded-2xl px-4 py-3">
        <Text className="text-text-muted text-sm">
          {debt
            ? 'Todavía no hay ritmo de pago suficiente para proyectar cuándo la saldás (o el pago no alcanza a cubrir el interés).'
            : 'Todavía no hay ritmo de ahorro suficiente para proyectar cuándo la alcanzás.'}
        </Text>
      </View>
    );
  }

  const [py, pm] = (data.projected_date ?? '').split('-').map(Number);

  return (
    <View className={`gap-1 rounded-2xl px-4 py-3 ${data.on_track ? 'bg-surface-2' : 'bg-warning/10'}`}>
      <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
        A este ritmo la {debt ? 'saldás' : 'alcanzás'} en {data.months_to_goal}{' '}
        {data.months_to_goal === 1 ? 'mes' : 'meses'}
      </Text>
      <Text className="text-text-muted text-xs">
        ~{formatMoney(data.monthly_rate, currency)}/mes · {debt ? 'debes' : 'faltan'}{' '}
        {formatMoney(data.remaining, currency)}
        {py ? ` · ${formatYearMonth({ year: py, month: pm })}` : ''}
      </Text>
      {data.on_track === false ? (
        <Text className="text-warning text-xs">Vas más lento que tu fecha objetivo.</Text>
      ) : null}
    </View>
  );
}
