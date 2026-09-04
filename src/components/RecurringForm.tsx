import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import {
  useCategories,
  useCreateRecurringExpense,
  useDeleteRecurringExpense,
  useRecurringExpense,
  useUpdateRecurringExpense,
  useWallets,
} from '@/api/queries';
import { walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import {
  RECURRENCE_FREQUENCIES,
  RECURRENCE_LABEL,
  type RecurrenceFrequency,
  type RecurringExpenseInput,
} from '@/api/types';
import { dismissModal } from '@/components/ui/ModalHeader';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Select } from '@/components/ui/Select';
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
  const walletsQ = useWallets();
  const create = useCreateRecurringExpense();
  const update = useUpdateRecurringExpense();
  const remove = useDeleteRecurringExpense();

  const [amount, setAmount] = useState('0.00');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [nextDue, setNextDue] = useState(todayISO());
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!editing || prefilled || !existing.data) return;
    const r = existing.data;
    setAmount(toNumber(r.amount).toFixed(2));
    setCategoryId(r.category);
    setWalletId(r.wallet);
    setFrequency(r.frequency);
    setNextDue(r.next_due_date);
    setIsActive(r.is_active);
    setPrefilled(true);
  }, [editing, prefilled, existing.data]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQ.data ?? []).map((c) => ({
        value: c.id,
        label: c.parent ? `  ${c.name}` : c.name,
      })),
    [categoriesQ.data],
  );

  const walletOptions = useMemo(
    () => (walletsQ.data ?? []).map((w) => ({ value: w.id, label: walletLabel(w) })),
    [walletsQ.data],
  );

  const amountNum = toNumber(amount);
  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit = amountNum > 0 && !!categoryId && !!walletId && !!nextDue && !busy;

  async function onSubmit() {
    if (!categoryId || !walletId) return;
    setFormError(null);
    setFields({});
    const payload: RecurringExpenseInput = {
      category: categoryId,
      wallet: walletId,
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
        <AmountInput label="Monto" value={amount} onChangeText={setAmount} error={fields.amount} />

        <Select
          label="Categoría"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
          placeholder={categoriesQ.isLoading ? 'Cargando…' : 'Elegir categoría'}
          error={fields.category}
        />

        <Select
          label="Cartera"
          value={walletId}
          onChange={setWalletId}
          options={walletOptions}
          placeholder={walletsQ.isLoading ? 'Cargando…' : 'Elegir cartera'}
          error={fields.wallet}
        />

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
