import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';

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
import type { TransactionInput, TransactionType } from '@/api/types';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { colors } from '@/theme';
import { todayISO } from '@/lib/date';

interface TransactionFormProps {
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

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('0.00');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [inBudget, setInBudget] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [accountDefaulted, setAccountDefaulted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isTransfer = type === 'transfer';

  const defaultAccountId = useMemo(() => {
    const list = accountsQ.data ?? [];
    return list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null;
  }, [accountsQ.data]);

  // Preselecciona la cuenta por defecto al crear (una sola vez, cuando cargan).
  useEffect(() => {
    if (editing || accountDefaulted || !defaultAccountId) return;
    setAccountId(defaultAccountId);
    setAccountDefaulted(true);
  }, [editing, accountDefaulted, defaultAccountId]);

  // Prefill de la transacción existente.
  useEffect(() => {
    if (!editing || prefilled || !existing.data || !categoriesQ.data) return;
    const t = existing.data;
    setType(t.type);
    setAmount(String(Number(t.amount).toFixed(2)));
    setCategoryId(t.category);
    setAccountId(t.account);
    setToAccountId(t.to_account);
    setDate(t.date);
    setNote(t.description ?? '');
    setInBudget(t.counts_toward_budget);
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
        hint: a.is_default ? 'por defecto' : a.visibility === 'private' ? 'privada' : undefined,
      })),
    [accountsQ.data],
  );

  const toAccountOptions = useMemo(
    () => accountOptions.filter((o) => o.value !== accountId),
    [accountOptions, accountId],
  );

  const amountNum = Number(amount.replace(',', '.'));
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit =
    amountValid &&
    !!accountId &&
    !!date &&
    (isTransfer ? !!toAccountId && toAccountId !== accountId : !!categoryId) &&
    !busy;

  function onChangeType(next: TransactionType) {
    setType(next);
    setCategoryId(null);
    if (next !== 'transfer') setToAccountId(null);
  }

  async function onSubmit() {
    if (!accountId) return;
    setFormError(null);
    setFields({});

    const payload: TransactionInput = {
      type,
      account: accountId,
      amount: amountNum.toFixed(2),
      date,
      description: note.trim() || undefined,
    };
    if (isTransfer) {
      payload.to_account = toAccountId;
    } else {
      payload.category = categoryId;
      if (type === 'expense') payload.counts_toward_budget = inBudget;
    }

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
            { value: 'transfer', label: 'Transfer.' },
          ]}
        />

        <AmountInput
          label="Monto"
          value={amount}
          onChangeText={setAmount}
          error={fields.amount}
          autoFocus={!editing}
        />

        {isTransfer ? (
          <>
            <Select
              label="Cuenta origen"
              value={accountId}
              onChange={setAccountId}
              options={accountOptions}
              placeholder={accountsQ.isLoading ? 'Cargando…' : 'Selecciona una cuenta'}
              error={fields.account}
            />
            <Select
              label="Cuenta destino"
              value={toAccountId}
              onChange={setToAccountId}
              options={toAccountOptions}
              placeholder="Selecciona la cuenta destino"
              error={fields.to_account}
            />
          </>
        ) : (
          <>
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
          </>
        )}

        <DateField label="Fecha" value={date} onChange={setDate} error={fields.date} />

        <TextField
          label="Nota (opcional)"
          placeholder="Descripción"
          value={note}
          onChangeText={setNote}
          error={fields.description}
        />

        {type === 'expense' ? (
          <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
            <View className="flex-1 pr-2">
              <Text className="text-text text-sm">Cuenta para el presupuesto</Text>
              <Text className="text-text-muted text-xs">
                {inBudget
                  ? 'Descuenta del presupuesto de su categoría.'
                  : 'No afecta el presupuesto (sí el saldo).'}
              </Text>
            </View>
            <Switch
              value={inBudget}
              onValueChange={setInBudget}
              trackColor={{ true: colors.primary, false: colors.surface2 }}
              thumbColor="#FFFFFF"
            />
          </View>
        ) : null}

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
