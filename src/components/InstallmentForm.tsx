import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  useCategories,
  useCreateInstallment,
  useDeleteInstallment,
  useInstallment,
  useUpdateInstallment,
} from '@/api/queries';
import { useAssignableWallets, walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { InstallmentPurchaseInput } from '@/api/types';
import { dismissModal } from '@/components/ui/ModalHeader';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Money } from '@/components/ui/Money';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { fonts } from '@/theme/typography';
import { formatShortDate, todayISO } from '@/lib/date';
import { toNumber } from '@/lib/money';

function toInt(value: string): number {
  const n = parseInt(value.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function InstallmentForm({ installmentId }: { installmentId?: string }) {
  const editing = !!installmentId;
  const existing = useInstallment(installmentId);
  const categoriesQ = useCategories();
  const { data: assignableWallets, query: walletsQ } = useAssignableWallets();
  const create = useCreateInstallment();
  const update = useUpdateInstallment();
  const remove = useDeleteInstallment();

  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('0.00');
  const [count, setCount] = useState('12');
  const [startDate, setStartDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!editing || prefilled || !existing.data) return;
    const p = existing.data;
    setDescription(p.description);
    setTotal(toNumber(p.total_amount).toFixed(2));
    setCount(String(p.installments_total));
    setStartDate(p.start_date);
    setCategoryId(p.category);
    setWalletId(p.wallet);
    setPrefilled(true);
  }, [editing, prefilled, existing.data]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => c.type === 'expense')
        .map((c) => ({ value: c.id, label: c.parent ? `  ${c.name}` : c.name })),
    [categoriesQ.data],
  );
  // Solo tarjetas de crédito con fecha de corte configurada: es lo único
  // que permite calcular las cuotas contra sus cortes de facturación.
  const eligibleCards = useMemo(
    () => assignableWallets.filter((w) => w.kind === 'credit' && !!w.billing_cycle_day),
    [assignableWallets],
  );
  const walletOptions = useMemo(
    () => eligibleCards.map((w) => ({ value: w.id, label: walletLabel(w) })),
    [eligibleCards],
  );

  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit =
    description.trim().length > 0 &&
    toNumber(total) > 0 &&
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
      total_amount: toNumber(total).toFixed(2),
      installments_total: toInt(count),
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

  const currency = eligibleCards.find((w) => w.id === walletId)?.currency ?? 'USD';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        {editing && existing.data ? (
          <View className="gap-1 rounded-2xl bg-surface-2 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-text-muted text-xs uppercase tracking-wide">
                {existing.data.is_completed ? 'Pagada por completo' : 'Cuota actual'}
              </Text>
              <Text className="text-text-muted text-xs">
                {existing.data.installments_paid}/{existing.data.installments_total} cuotas
              </Text>
            </View>
            {!existing.data.is_completed ? (
              <View className="flex-row items-baseline justify-between">
                <Money
                  value={existing.data.current_installment_amount}
                  currency={currency}
                  className="text-lg font-semibold"
                />
                {existing.data.next_due_date ? (
                  <Text className="text-text-muted text-xs">
                    corte del {formatShortDate(existing.data.next_due_date)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <TextField
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Laptop, sofá, curso…"
          error={fields.description}
        />

        <AmountInput label="Precio total" value={total} onChangeText={setTotal} error={fields.total_amount} />

        <TextField
          label="Nº de cuotas"
          value={count}
          onChangeText={(t) => setCount(t.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
          error={fields.installments_total}
        />

        <DateField
          label="Fecha de la compra"
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

        <View className="gap-2">
          <Select
            label="Tarjeta"
            value={walletId}
            onChange={setWalletId}
            options={walletOptions}
            placeholder={
              walletsQ.isLoading
                ? 'Cargando…'
                : walletOptions.length === 0
                  ? 'Sin tarjetas elegibles'
                  : 'Elegir tarjeta'
            }
            error={fields.wallet}
          />
          {!walletsQ.isLoading && walletOptions.length === 0 ? (
            <Text className="text-text-muted text-xs">
              Solo se puede registrar en una tarjeta de crédito con fecha de corte
              configurada. Configurala editando la tarjeta.
            </Text>
          ) : (
            <Text className="text-text-muted text-xs">
              Se registra un solo gasto por el total contra esta tarjeta, hoy. Las
              cuotas de acá abajo son solo para calcular el estado de cuenta, según
              los cortes de esta tarjeta -- no generan movimientos propios.
            </Text>
          )}
        </View>

        {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

        <Button
          label={editing ? 'Guardar cambios' : 'Crear compra a plazo'}
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
              Eliminar
            </Text>
          </Pressable>
        ) : null}

        {editing && confirmingDelete ? (
          <View className="gap-2 rounded-2xl bg-expense/10 p-3">
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
