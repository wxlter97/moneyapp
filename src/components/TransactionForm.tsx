import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { dismissModal } from '@/components/ui/ModalHeader';

import {
  useAccounts,
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/api/queries';
import { accountLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { CategoryType } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { todayISO } from '@/lib/date';

interface TransactionFormProps {
  /** Si se pasa, el formulario edita esa transacción; si no, crea una nueva. */
  transactionId?: string;
}

export function TransactionForm({ transactionId }: TransactionFormProps) {
  const editing = !!transactionId;
  const existing = useTransaction(transactionId);

  const accountsQ = useAccounts();
  const categoriesQ = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();

  const [type, setType] = useState<CategoryType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Prefill al cargar la transacción existente (una sola vez).
  useEffect(() => {
    if (!editing || prefilled || !existing.data || !categoriesQ.data) return;
    const t = existing.data;
    const cat = categoriesQ.data.find((c) => c.id === t.category);
    setType(cat?.type ?? 'expense');
    setAmount(String(Number(t.amount)));
    setCategoryId(t.category);
    setAccountId(t.account);
    setDate(t.date);
    setNote(t.description ?? '');
    setPrefilled(true);
  }, [editing, prefilled, existing.data, categoriesQ.data]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => c.type === type)
        .map((c) => ({ value: c.id, label: c.name })),
    [categoriesQ.data, type],
  );

  const accountOptions = useMemo(
    () =>
      (accountsQ.data ?? []).map((a) => ({
        value: a.id,
        label: accountLabel(a),
        hint: a.visibility === 'private' ? 'privada' : undefined,
      })),
    [accountsQ.data],
  );

  const amountNum = Number(amount.replace(',', '.'));
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit = amountValid && !!categoryId && !!accountId && !!date && !busy;

  function onChangeType(next: CategoryType) {
    setType(next);
    setCategoryId(null);
  }

  async function onSubmit() {
    if (!categoryId || !accountId) return;
    setFormError(null);
    setFields({});
    const payload = {
      account: accountId,
      category: categoryId,
      amount: amountNum.toFixed(2),
      date,
      description: note.trim() || undefined,
    };
    try {
      if (editing) await update.mutateAsync({ id: transactionId!, input: payload });
      else await create.mutateAsync(payload);
      dismissModal();
    } catch (err) {
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo guardar la transacción.'));
    }
  }

  async function onDelete() {
    if (!transactionId) return;
    try {
      await remove.mutateAsync(transactionId);
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
          ]}
        />

        <TextField
          label="Monto"
          keyboardType="decimal-pad"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          error={fields.amount}
        />

        <Select
          label="Categoría"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
          placeholder={
            categoriesQ.isLoading
              ? 'Cargando…'
              : `Categoría de ${type === 'income' ? 'ingreso' : 'gasto'}`
          }
          error={fields.category}
        />

        <Select
          label="Cuenta"
          value={accountId}
          onChange={setAccountId}
          options={accountOptions}
          placeholder={accountsQ.isLoading ? 'Cargando…' : 'Selecciona una cuenta'}
          error={fields.account}
        />

        <DateField label="Fecha" value={date} onChange={setDate} error={fields.date} maxToday />

        <TextField
          label="Nota (opcional)"
          placeholder="Descripción"
          value={note}
          onChangeText={setNote}
          error={fields.description}
        />

        {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

        <Button
          label={editing ? 'Guardar cambios' : 'Guardar'}
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
            <Text className="text-expense text-sm font-semibold">Eliminar transacción</Text>
          </Pressable>
        ) : null}

        {editing && confirmingDelete ? (
          <View className="gap-2 rounded-xl border border-expense/40 bg-expense/10 p-3">
            <Text className="text-text text-sm">
              ¿Eliminar esta transacción? No se puede deshacer.
            </Text>
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
