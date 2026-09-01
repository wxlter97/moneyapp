import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import {
  useCreateWallet,
  useDeleteWallet,
  useUpdateWallet,
  useWallet,
  useWallets,
} from '@/api/queries';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { WalletInput, WalletPurpose } from '@/api/types';
import { dismissModal } from '@/components/ui/ModalHeader';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { colors } from '@/theme';
import { toNumber } from '@/lib/money';

interface WalletFormProps {
  walletId?: string;
}

const PURPOSE_OPTIONS: { value: WalletPurpose; label: string }[] = [
  { value: 'spending', label: 'Gasto' },
  { value: 'savings', label: 'Ahorro' },
  { value: 'debt', label: 'Deuda' },
  { value: 'asset', label: 'Activo' },
];

export function WalletForm({ walletId }: WalletFormProps) {
  const editing = !!walletId;
  const existing = useWallet(walletId);
  const walletsQ = useWallets();
  const create = useCreateWallet();
  const update = useUpdateWallet();
  const remove = useDeleteWallet();

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState<WalletPurpose>('spending');
  const [amount, setAmount] = useState('0.00');
  const [debtOwedToUs, setDebtOwedToUs] = useState(false); // deuda: "me deben"
  const [parentId, setParentId] = useState<string | null>(null);
  const [countsNet, setCountsNet] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [goalAmount, setGoalAmount] = useState('0.00');
  const [goalDate, setGoalDate] = useState('');
  const [monthly, setMonthly] = useState('0.00');
  const [cardLast4, setCardLast4] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!editing || prefilled || !existing.data) return;
    const w = existing.data;
    setName(w.name);
    setPurpose(w.purpose);
    const bal = toNumber(w.opening_balance);
    setDebtOwedToUs(w.purpose === 'debt' && bal > 0);
    setAmount(Math.abs(bal).toFixed(2));
    setParentId(w.parent);
    setCountsNet(w.counts_toward_net_worth);
    setIsDefault(w.is_default);
    setGoalAmount(w.goal_amount ? toNumber(w.goal_amount).toFixed(2) : '0.00');
    setGoalDate(w.goal_date ?? '');
    setMonthly(w.monthly_contribution ? toNumber(w.monthly_contribution).toFixed(2) : '0.00');
    setCardLast4(w.card_last4 ?? '');
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

  const isDebt = purpose === 'debt';
  const isSavings = purpose === 'savings';
  const amountNum = toNumber(amount);
  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit = name.trim().length > 0 && !busy;

  function onChangePurpose(next: WalletPurpose) {
    setPurpose(next);
    setParentId(null);
  }

  async function onSubmit() {
    setFormError(null);
    setFields({});

    const signed = isDebt && !debtOwedToUs ? -amountNum : amountNum;
    const payload: WalletInput = {
      name: name.trim(),
      purpose,
      parent: parentId || null,
      opening_balance: signed.toFixed(2),
      counts_toward_net_worth: countsNet,
      is_default: isDefault,
      goal_amount: isSavings && toNumber(goalAmount) > 0 ? toNumber(goalAmount).toFixed(2) : null,
      goal_date: isSavings && goalDate ? goalDate : null,
      monthly_contribution:
        isSavings && toNumber(monthly) > 0 ? toNumber(monthly).toFixed(2) : null,
      card_last4: isDebt && cardLast4.trim() ? cardLast4.trim() : null,
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
          <View className="gap-1.5">
            <Text className="text-text-muted text-sm">Tipo</Text>
            <Segmented value={purpose} onChange={onChangePurpose} options={PURPOSE_OPTIONS} />
          </View>
        ) : null}

        {isDebt ? (
          <Segmented
            value={debtOwedToUs ? 'favor' : 'contra'}
            onChange={(v) => setDebtOwedToUs(v === 'favor')}
            options={[
              { value: 'contra', label: 'Debo' },
              { value: 'favor', label: 'Me deben' },
            ]}
          />
        ) : null}

        <AmountInput label={amountLabel} value={amount} onChangeText={setAmount} />

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
          </>
        ) : null}

        {isDebt ? (
          <>
            <TextField
              label="Últimos 4 dígitos (tarjeta, opcional)"
              value={cardLast4}
              onChangeText={(t) => setCardLast4(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="4242"
            />
            <TextField
              label="Persona / entidad (opcional)"
              value={counterparty}
              onChangeText={setCounterparty}
            />
          </>
        ) : null}

        <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
          <Text className="text-text text-sm">Cuenta para el patrimonio neto</Text>
          <Switch
            value={countsNet}
            onValueChange={setCountsNet}
            trackColor={{ true: colors.primary, false: colors.surface2 }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
          <Text className="text-text text-sm">Preseleccionar al crear transacciones</Text>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
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
          <Pressable
            onPress={() => setConfirmingDelete(true)}
            disabled={busy}
            className="items-center py-2 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-expense text-sm font-semibold">Eliminar cartera</Text>
          </Pressable>
        ) : null}

        {editing && confirmingDelete ? (
          <View className="gap-2 rounded-xl border border-expense/40 bg-expense/10 p-3">
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
