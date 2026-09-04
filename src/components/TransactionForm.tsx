import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';

import { dismissModal } from '@/components/ui/ModalHeader';

import {
  useWallets,
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/api/queries';
import { walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { TransactionInput, TransactionType } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { NumPad } from '@/components/ui/NumPad';
import { PickerRow } from '@/components/ui/PickerRow';
import { Segmented } from '@/components/ui/Segmented';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { useColors } from '@/theme';
import { todayISO } from '@/lib/date';
import { formatMoney, toNumber } from '@/lib/money';

interface TransactionFormProps {
  transactionId?: string;
}

type OpenRow = 'category' | 'from' | 'to' | null;

export function TransactionForm({ transactionId }: TransactionFormProps) {
  const colors = useColors();
  const editing = !!transactionId;
  const existing = useTransaction(transactionId);

  const walletsQ = useWallets();
  const categoriesQ = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('0.00');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [toWalletId, setToWalletId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [inBudget, setInBudget] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [walletDefaulted, setWalletDefaulted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [openRow, setOpenRow] = useState<OpenRow>(null);

  const isTransfer = type === 'transfer';

  const defaultWalletId = useMemo(() => {
    const list = walletsQ.data ?? [];
    return list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null;
  }, [walletsQ.data]);

  useEffect(() => {
    if (editing || walletDefaulted || !defaultWalletId) return;
    setWalletId(defaultWalletId);
    setWalletDefaulted(true);
  }, [editing, walletDefaulted, defaultWalletId]);

  useEffect(() => {
    if (!editing || prefilled || !existing.data || !categoriesQ.data) return;
    const t = existing.data;
    setType(t.type);
    setAmount(String(Number(t.amount).toFixed(2)));
    setCategoryId(t.category);
    setWalletId(t.wallet);
    setToWalletId(t.to_wallet);
    setDate(t.date);
    setNote(t.description ?? '');
    setInBudget(t.counts_toward_budget);
    setPrefilled(true);
  }, [editing, prefilled, existing.data, categoriesQ.data]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => (isTransfer ? true : c.type === type))
        .map((c) => ({
          value: c.id,
          label: c.parent ? `  ${c.name}` : c.name,
        })),
    [categoriesQ.data, type, isTransfer],
  );

  const walletOptions = useMemo(
    () =>
      (walletsQ.data ?? []).map((a) => ({
        value: a.id,
        label: walletLabel(a),
        hint: a.is_default ? 'por defecto' : a.visibility === 'private' ? 'privada' : undefined,
      })),
    [walletsQ.data],
  );

  const toWalletOptions = useMemo(
    () => walletOptions.filter((o) => o.value !== walletId),
    [walletOptions, walletId],
  );

  const amountNum = Number(amount.replace(',', '.'));
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit =
    amountValid &&
    !!walletId &&
    !!date &&
    (isTransfer ? !!toWalletId && toWalletId !== walletId : !!categoryId) &&
    !busy;

  const currency = walletsQ.data?.[0]?.currency ?? 'USD';
  const showBudgetSwitch = type === 'expense' || (isTransfer && !!categoryId);

  function onChangeType(next: TransactionType) {
    setType(next);
    setCategoryId(null);
    setOpenRow(null);
    if (next !== 'transfer') setToWalletId(null);
  }

  function toggleRow(row: Exclude<OpenRow, null>) {
    setOpenRow((cur) => (cur === row ? null : row));
  }

  function swapWallets() {
    setWalletId(toWalletId);
    setToWalletId(walletId);
  }

  async function onSubmit() {
    if (!walletId) return;
    setFormError(null);
    setFields({});

    const payload: TransactionInput = {
      type,
      wallet: walletId,
      amount: amountNum.toFixed(2),
      date,
      description: note.trim() || undefined,
    };
    if (isTransfer) {
      payload.to_wallet = toWalletId;
      payload.category = categoryId || null;
      if (categoryId) payload.counts_toward_budget = inBudget;
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

  const amountColor =
    type === 'income' ? colors.income : type === 'expense' ? colors.expense : colors.text;

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 py-3"
        keyboardShouldPersistTaps="handled"
      >
        <Segmented
          value={type}
          onChange={onChangeType}
          options={[
            { value: 'expense', label: 'Gasto' },
            { value: 'income', label: 'Ingreso' },
            { value: 'transfer', label: 'Transfer.' },
          ]}
        />

        <View className="items-center py-2">
          <Text className="text-3xl font-bold" style={{ color: amountColor }}>
            {formatMoney(amountNum || 0, currency)}
          </Text>
          {fields.amount ? (
            <Text className="text-expense mt-1 text-xs">{fields.amount}</Text>
          ) : null}
        </View>

        {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

        <View className="gap-1">
          <PickerRow
            label={isTransfer ? 'Categoría (opcional)' : 'Categoría'}
            options={
              isTransfer
                ? [{ value: '', label: 'Sin categoría' }, ...categoryOptions]
                : categoryOptions
            }
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v || null);
              setOpenRow(null);
            }}
            open={openRow === 'category'}
            onToggle={() => toggleRow('category')}
            placeholder={
              categoriesQ.isLoading
                ? 'Cargando…'
                : !isTransfer && categoryOptions.length === 0
                  ? `Sin categorías de ${type === 'income' ? 'ingreso' : 'gasto'}`
                  : 'Elegir'
            }
            error={fields.category}
          />

          <PickerRow
            label={isTransfer ? 'Desde' : 'Cartera'}
            options={walletOptions}
            value={walletId}
            onChange={(v) => {
              setWalletId(v);
              setOpenRow(null);
            }}
            open={openRow === 'from'}
            onToggle={() => toggleRow('from')}
            placeholder={walletsQ.isLoading ? 'Cargando…' : 'Elegir'}
            error={fields.wallet}
          />

          {isTransfer ? (
            <>
              <View className="items-center py-1">
                <Pressable
                  onPress={swapWallets}
                  accessibilityLabel="Intercambiar carteras"
                  accessibilityRole="button"
                  className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
                >
                  <Text className="text-text">⇅</Text>
                </Pressable>
              </View>
              <PickerRow
                label="A"
                options={toWalletOptions}
                value={toWalletId}
                onChange={(v) => {
                  setToWalletId(v);
                  setOpenRow(null);
                }}
                open={openRow === 'to'}
                onToggle={() => toggleRow('to')}
                placeholder="Elegir"
                error={fields.to_wallet}
              />
            </>
          ) : null}
        </View>

        {!isTransfer ? (
          <Pressable
            onPress={() => router.push(`/category/new?type=${type}`)}
            className="self-start py-1 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-primary text-xs font-semibold">+ Nueva categoría</Text>
          </Pressable>
        ) : null}

        <DateField label="Fecha" value={date} onChange={setDate} error={fields.date} />

        <TextField
          label="Nota (opcional)"
          placeholder="Descripción"
          value={note}
          onChangeText={setNote}
          error={fields.description}
        />

        {showBudgetSwitch ? (
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

      <NumPad value={amount} onChange={setAmount} />
    </View>
  );
}
