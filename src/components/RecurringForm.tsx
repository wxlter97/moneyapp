import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import {
  useCategories,
  useCreateRecurringExpense,
  useDeleteRecurringExpense,
  useRecurringExpense,
  useUpdateRecurringExpense,
} from '@/api/queries';
import { useAssignableWallets, walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import {
  RECURRENCE_FREQUENCIES,
  RECURRENCE_LABEL,
  type RecurrenceFrequency,
  type RecurringExpenseInput,
  type TransactionType,
} from '@/api/types';
import { dismissModal } from '@/components/ui/ModalHeader';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { todayISO } from '@/lib/date';
import { toNumber } from '@/lib/money';

const FREQ_OPTIONS = RECURRENCE_FREQUENCIES.map((f) => ({
  value: f,
  label: RECURRENCE_LABEL[f],
}));

export function RecurringForm({ recurringId }: { recurringId?: string }) {
  const colors = useColors();
  const editing = !!recurringId;
  const existing = useRecurringExpense(recurringId);
  const categoriesQ = useCategories();
  const { data: assignableWallets, query: walletsQ } = useAssignableWallets();
  const create = useCreateRecurringExpense();
  const update = useUpdateRecurringExpense();
  const remove = useDeleteRecurringExpense();

  const [type, setType] = useState<TransactionType>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [toWalletId, setToWalletId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [nextDue, setNextDue] = useState(todayISO());
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isTransfer = type === 'transfer';

  useEffect(() => {
    if (!editing || prefilled || !existing.data) return;
    const r = existing.data;
    setType(r.type);
    setName(r.name ?? '');
    setAmount(toNumber(r.amount).toFixed(2));
    setCategoryId(r.category);
    setWalletId(r.wallet);
    setToWalletId(r.to_wallet);
    setFrequency(r.frequency);
    setNextDue(r.next_due_date);
    setIsActive(r.is_active);
    setPrefilled(true);
  }, [editing, prefilled, existing.data]);

  // Sólo categorías del tipo elegido -- igual que en "Nueva transacción":
  // una vez que cambiás Gasto/Ingreso, la categoría vieja (del otro tipo) ya
  // no aplica.
  const categoryOptions = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => c.type === type)
        .map((c) => ({
          value: c.id,
          label: c.parent ? `  ${c.name}` : c.name,
        })),
    [categoriesQ.data, type],
  );

  const walletOptions = useMemo(
    () => assignableWallets.map((w) => ({ value: w.id, label: walletLabel(w) })),
    [assignableWallets],
  );

  // La cartera destino no puede ser la misma que la de origen.
  const toWalletOptions = useMemo(
    () => walletOptions.filter((w) => w.value !== walletId),
    [walletOptions, walletId],
  );

  const amountNum = toNumber(amount);
  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit =
    amountNum > 0 &&
    !!walletId &&
    !!nextDue &&
    (isTransfer ? !!toWalletId && toWalletId !== walletId : !!categoryId) &&
    !busy;

  function onChangeType(next: TransactionType) {
    setType(next);
    setCategoryId(null);
    // Al pasar a transferencia la categoría ya no aplica; al salir de
    // transferencia, la cartera destino tampoco.
    if (next === 'transfer') setToWalletId((prev) => (prev === walletId ? null : prev));
  }

  async function onSubmit() {
    if (!walletId) return;
    setFormError(null);
    setFields({});
    const payload: RecurringExpenseInput = {
      type,
      name: name.trim(),
      category: isTransfer ? null : categoryId,
      wallet: walletId,
      to_wallet: isTransfer ? toWalletId : null,
      amount: amountNum.toFixed(2),
      frequency,
      next_due_date: nextDue,
      is_active: isActive,
    };
    try {
      if (editing) await update.mutateAsync({ id: recurringId!, input: payload });
      else await create.mutateAsync(payload);
      dismissModal();
    } catch (err) {
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo guardar el recurrente.'));
    }
  }

  async function onDelete() {
    if (!recurringId) return;
    try {
      await remove.mutateAsync(recurringId);
      dismissModal();
    } catch (err) {
      setConfirmingDelete(false);
      setFormError(errorMessage(err, 'No se pudo eliminar.'));
    }
  }

  if (editing && existing.isLoading) return <LoadingState />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        <Segmented
          value={type}
          onChange={onChangeType}
          options={[
            { value: 'expense', label: 'Gasto' },
            { value: 'income', label: 'Ingreso' },
            { value: 'transfer', label: 'Transfer.' },
          ]}
        />

        <TextField
          label="Nombre (opcional)"
          placeholder={isTransfer ? 'Aporte a meta de ahorro…' : 'Netflix, iCloud, gimnasio…'}
          value={name}
          onChangeText={setName}
          error={fields.name}
        />

        <AmountInput label="Monto" value={amount} onChangeText={setAmount} error={fields.amount} />

        {!isTransfer ? (
          <Select
            label="Categoría"
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions}
            placeholder={categoriesQ.isLoading ? 'Cargando…' : 'Elegir categoría'}
            error={fields.category}
          />
        ) : null}

        <Select
          label={isTransfer ? 'Desde' : 'Cartera'}
          value={walletId}
          onChange={(v) => {
            setWalletId(v);
            if (v === toWalletId) setToWalletId(null);
          }}
          options={walletOptions}
          placeholder={walletsQ.isLoading ? 'Cargando…' : 'Elegir cartera'}
          error={fields.wallet}
        />

        {isTransfer ? (
          <Select
            label="A (cartera destino)"
            value={toWalletId}
            onChange={setToWalletId}
            options={toWalletOptions}
            placeholder={walletsQ.isLoading ? 'Cargando…' : 'Elegir cartera'}
            error={fields.to_wallet}
          />
        ) : null}

        <Select
          label="Frecuencia"
          value={frequency}
          onChange={(v) => setFrequency(v as RecurrenceFrequency)}
          options={FREQ_OPTIONS}
          error={fields.frequency}
        />

        <DateField
          label="Próxima fecha"
          value={nextDue}
          onChange={setNextDue}
          error={fields.next_due_date}
          minToday
        />

        <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            Activo
          </Text>
          <Switch
            value={isActive}
            onValueChange={(v) => {
              haptics.tap();
              setIsActive(v);
            }}
            trackColor={{ true: colors.primary, false: colors.surface2 }}
            thumbColor="#FFFFFF"
          />
        </View>

        {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

        <Button
          label={editing ? 'Guardar cambios' : 'Crear recurrente'}
          loading={create.isPending || update.isPending}
          disabled={!canSubmit}
          onPress={onSubmit}
        />

        {editing && !confirmingDelete ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              setConfirmingDelete(true);
            }}
            disabled={busy}
            className="items-center py-2 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-expense text-sm" style={{ fontFamily: fonts.semibold }}>
              Eliminar recurrente
            </Text>
          </Pressable>
        ) : null}

        {editing && confirmingDelete ? (
          <View className="gap-2 rounded-2xl bg-expense/10 p-3">
            <Text className="text-text text-sm">¿Eliminar este recurrente?</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Cancelar" variant="ghost" onPress={() => setConfirmingDelete(false)} />
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
