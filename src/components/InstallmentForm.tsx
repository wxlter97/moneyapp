import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  useCategories,
  useCreateInstallment,
  useDeleteInstallment,
  useInstallment,
  useUpdateInstallment,
  useWallets,
} from '@/api/queries';
import { walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { InstallmentPurchaseInput } from '@/api/types';
import { dismissModal } from '@/components/ui/ModalHeader';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { todayISO } from '@/lib/date';
import { toNumber } from '@/lib/money';

function toInt(value: string): number {
  const n = parseInt(value.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function InstallmentForm({ installmentId }: { installmentId?: string }) {
  const editing = !!installmentId;
  const existing = useInstallment(installmentId);
  const categoriesQ = useCategories();
  const walletsQ = useWallets();
  const create = useCreateInstallment();
  const update = useUpdateInstallment();
  const remove = useDeleteInstallment();

  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('0.00');
  const [installment, setInstallment] = useState('0.00');
  const [count, setCount] = useState('12');
  const [paid, setPaid] = useState('0');
  const [startDate, setStartDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [touchedInstallment, setTouchedInstallment] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!editing || prefilled || !existing.data) return;
    const p = existing.data;
    setDescription(p.description);
    setTotal(toNumber(p.total_amount).toFixed(2));
    setInstallment(toNumber(p.installment_amount).toFixed(2));
    setCount(String(p.installments_total));
    setPaid(String(p.installments_paid));
    setStartDate(p.start_date);
    setCategoryId(p.category);
    setWalletId(p.wallet);
    setTouchedInstallment(true);
    setPrefilled(true);
  }, [editing, prefilled, existing.data]);

  // Sugiere el monto de cuota = total / nº de cuotas mientras no lo toquen.
  useEffect(() => {
    if (touchedInstallment) return;
    const c = toInt(count);
    const t = toNumber(total);
    if (c > 0 && t > 0) setInstallment((t / c).toFixed(2));
  }, [count, total, touchedInstallment]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => c.type === 'expense')
        .map((c) => ({ value: c.id, label: c.parent ? `  ${c.name}` : c.name })),
    [categoriesQ.data],
  );
  const walletOptions = useMemo(
    () => (walletsQ.data ?? []).map((w) => ({ value: w.id, label: walletLabel(w) })),
    [walletsQ.data],
  );

  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit =
    description.trim().length > 0 &&
    toNumber(installment) > 0 &&
    toInt(count) > 0 &&
    !!categoryId &&
    !!walletId &&
    !busy;

  async function onSubmit() {
    if (!categoryId || !walletId) return;
    setFormError(null);
    setFields({});
    const payload: InstallmentPurchaseInput = {
      wallet: walletId,
      category: categoryId,
      description: description.trim(),
      total_amount: (toNumber(total) || toNumber(installment) * toInt(count)).toFixed(2),
      installment_amount: toNumber(installment).toFixed(2),
      installments_total: toInt(count),
      installments_paid: Math.min(toInt(paid), toInt(count)),
      start_date: startDate,
    };
    try {
      if (editing) await update.mutateAsync({ id: installmentId!, input: payload });
      else await create.mutateAsync(payload);
      dismissModal();
    } catch (err) {
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo guardar la compra a plazo.'));
    }
  }

  async function onDelete() {
    if (!installmentId) return;
    try {
      await remove.mutateAsync(installmentId);
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
        <TextField
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Laptop, sofá, curso…"
          error={fields.description}
        />

        <AmountInput label="Precio total" value={total} onChangeText={setTotal} error={fields.total_amount} />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Nº de cuotas"
              value={count}
              onChangeText={(t) => setCount(t.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              error={fields.installments_total}
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Ya pagadas"
              value={paid}
              onChangeText={(t) => setPaid(t.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              error={fields.installments_paid}
            />
          </View>
        </View>

        <AmountInput
          label="Monto por cuota"
          value={installment}
          onChangeText={(t) => {
            setTouchedInstallment(true);
            setInstallment(t);
          }}
          error={fields.installment_amount}
        />

        <DateField
          label="Fecha de la 1.ª cuota"
          value={startDate}
          onChange={setStartDate}
          error={fields.start_date}
        />

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

        {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

        <Button
          label={editing ? 'Guardar cambios' : 'Crear compra a plazo'}
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
            <Text className="text-expense text-sm font-semibold">Eliminar</Text>
          </Pressable>
        ) : null}

        {editing && confirmingDelete ? (
          <View className="gap-2 rounded-xl border border-expense/40 bg-expense/10 p-3">
            <Text className="text-text text-sm">¿Eliminar esta compra a plazo?</Text>
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
