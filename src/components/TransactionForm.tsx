import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { dismissModal } from '@/components/ui/ModalHeader';

import {
  useCardProducts,
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
  useUploadReceipt,
} from '@/api/queries';
import { useAssignableWallets, walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { TransactionInput, TransactionType } from '@/api/types';
import { CategoryPickerField } from '@/components/CategoryGrid';
import { ReceiptField } from '@/components/ReceiptField';
import { TagPicker } from '@/components/TagPicker';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Icon } from '@/components/ui/Icon';
import { NumPad } from '@/components/ui/NumPad';
import { PickerRow } from '@/components/ui/PickerRow';
import { Segmented } from '@/components/ui/Segmented';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import type { PickedFile } from '@/lib/receipt';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { todayISO } from '@/lib/date';
import { formatMoney, toNumber } from '@/lib/money';
import { useSnackbarStore } from '@/store/snackbar';

interface TransactionFormProps {
  transactionId?: string;
  /** Precarga los datos de esta transacción sin editarla: se guarda como una nueva. */
  duplicateFromId?: string;
}

type OpenRow = 'category' | 'from' | 'to' | null;

export function TransactionForm({ transactionId, duplicateFromId }: TransactionFormProps) {
  const colors = useColors();
  const editing = !!transactionId;
  const sourceId = transactionId ?? duplicateFromId;
  const existing = useTransaction(sourceId);

  const { data: assignableWallets, query: walletsQ } = useAssignableWallets();
  const categoriesQ = useCategories();
  const cardProductsQ = useCardProducts();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const uploadReceipt = useUploadReceipt();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('0.00');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [toWalletId, setToWalletId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [inBudget, setInBudget] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [walletDefaulted, setWalletDefaulted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [openRow, setOpenRow] = useState<OpenRow>(null);
  const [pendingReceipt, setPendingReceipt] = useState<PickedFile | null>(null);
  // Descuento sugerido: sólo al crear (ver docstring más abajo), aplicado a
  // mano con el botón "Aplicar descuento" -- nunca automático.
  const [discountProgramId, setDiscountProgramId] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{ programId: string; original: number } | null>(
    null,
  );

  const isTransfer = type === 'transfer';

  const defaultWalletId = useMemo(() => {
    return assignableWallets.find((a) => a.is_default)?.id ?? assignableWallets[0]?.id ?? null;
  }, [assignableWallets]);

  useEffect(() => {
    if (editing || duplicateFromId || walletDefaulted || !defaultWalletId) return;
    setWalletId(defaultWalletId);
    setWalletDefaulted(true);
  }, [editing, duplicateFromId, walletDefaulted, defaultWalletId]);

  useEffect(() => {
    if ((!editing && !duplicateFromId) || prefilled || !existing.data || !categoriesQ.data) return;
    const t = existing.data;
    setType(t.type);
    setAmount(String(Number(t.amount).toFixed(2)));
    setCategoryId(t.category);
    setWalletId(t.wallet);
    setToWalletId(t.to_wallet);
    setDate(t.date);
    setNote(t.description ?? '');
    setTagNames((t.tags ?? []).map((tag) => tag.name));
    setInBudget(t.counts_toward_budget);
    setPrefilled(true);
  }, [editing, prefilled, existing.data, categoriesQ.data]);

  const walletOptions = useMemo(
    () =>
      assignableWallets.map((a) => ({
        value: a.id,
        label: walletLabel(a),
        hint: a.is_default ? 'por defecto' : a.visibility === 'private' ? 'privada' : undefined,
      })),
    [assignableWallets],
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

  // La de la cartera elegida, no la primera de la lista -- el backend igual
  // ignora cualquier moneda del cliente y usa siempre la de `wallet`
  // (ver Transaction.save()), pero mostrar la ajena confundía mientras se
  // tipeaba el monto.
  const currency = walletsQ.data?.find((w) => w.id === walletId)?.currency ?? 'USD';
  const showBudgetSwitch = type === 'expense' || (isTransfer && !!categoryId);

  // Descuento sugerido de la tarjeta elegida (si tiene un producto de
  // lealtad con un programa de descuento activo) para la categoría elegida.
  // Sólo al CREAR: al editar, el monto ya está neto de cualquier descuento
  // aplicado -- volver a sugerir acá lo descontaría dos veces (ver
  // `TransactionSerializer` en el backend). Al editar se muestra en cambio
  // lo que ya generó la transacción (más abajo, `loyalty_earnings`).
  const selectedWallet = assignableWallets.find((w) => w.id === walletId);
  const selectedCategory = categoriesQ.data?.find((c) => c.id === categoryId);
  const cardProduct = cardProductsQ.data?.find((p) => p.id === selectedWallet?.card_product);

  function rateFor(program: { default_rate: string; category_rates: { category_type: string; rate: string }[] }) {
    const override = selectedCategory?.category_type
      ? program.category_rates.find((r) => r.category_type === selectedCategory.category_type)
      : undefined;
    return toNumber(override?.rate ?? program.default_rate);
  }

  const discountPrograms = useMemo(
    () => (cardProduct?.programs ?? []).filter((p) => p.kind === 'discount' && p.is_active),
    [cardProduct],
  );
  // Puntos/cashback son automáticos (la señal del backend los genera solos)
  // -- esto es sólo una vista previa, para saber ANTES de guardar qué vas a
  // ganar. Sólo al crear, mismo criterio que el descuento (ver abajo).
  const autoPrograms = useMemo(
    () => (cardProduct?.programs ?? []).filter((p) => (p.kind === 'points' || p.kind === 'cashback') && p.is_active),
    [cardProduct],
  );
  const benefitLines =
    !editing && !isTransfer && type === 'expense' && amountValid
      ? autoPrograms
          .map((p) => {
            const rate = rateFor(p);
            if (!rate) return null;
            const label = p.name ? ` (${p.name})` : '';
            return p.kind === 'points'
              ? `+${Math.round(amountNum * rate)} puntos${label}`
              : `+${formatMoney(amountNum * rate, currency)} cashback${label}`;
          })
          .filter((x): x is string => x != null)
      : [];

  useEffect(() => {
    if (discountPrograms.length === 0) {
      if (discountProgramId) setDiscountProgramId(null);
    } else if (!discountPrograms.some((p) => p.id === discountProgramId)) {
      setDiscountProgramId(discountPrograms[0].id);
    }
  }, [discountPrograms, discountProgramId]);

  useEffect(() => {
    if (appliedDiscount && !discountPrograms.some((p) => p.id === appliedDiscount.programId)) {
      setAppliedDiscount(null);
    }
  }, [discountPrograms, appliedDiscount]);

  const activeDiscountProgram = discountPrograms.find((p) => p.id === discountProgramId) ?? null;
  const discountRate = activeDiscountProgram ? rateFor(activeDiscountProgram) : 0;
  const suggestedAmount = amountNum * (1 - discountRate);
  const showDiscountHint =
    !editing &&
    !isTransfer &&
    type === 'expense' &&
    !appliedDiscount &&
    !!activeDiscountProgram &&
    amountValid &&
    discountRate > 0;

  function applyDiscount() {
    if (!activeDiscountProgram) return;
    haptics.tap();
    setAppliedDiscount({ programId: activeDiscountProgram.id, original: amountNum });
    setAmount(suggestedAmount.toFixed(2));
  }

  function removeDiscount() {
    if (!appliedDiscount) return;
    haptics.tap();
    setAmount(appliedDiscount.original.toFixed(2));
    setAppliedDiscount(null);
  }

  function onChangeType(next: TransactionType) {
    setType(next);
    setCategoryId(null);
    setOpenRow(null);
    setAppliedDiscount(null);
    if (next !== 'transfer') setToWalletId(null);
  }

  function toggleRow(row: Exclude<OpenRow, null>) {
    setOpenRow((cur) => (cur === row ? null : row));
  }

  function swapWallets() {
    setWalletId(toWalletId);
    setToWalletId(walletId);
  }

  // Reinterpreta TODOS los dígitos tecleados como centavos (mismo esquema
  // "cajero" que `NumPad`/`AmountInput`), así da igual si el monto se teclea
  // con el teclado físico/del sistema o tocando el NumPad de abajo.
  function onAmountKeyPress(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    const cents = digits ? parseInt(digits, 10) : 0;
    setAmount((cents / 100).toFixed(2));
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
      tag_names: tagNames,
    };
    if (isTransfer) {
      payload.to_wallet = toWalletId;
      payload.category = categoryId || null;
      if (categoryId) payload.counts_toward_budget = inBudget;
    } else {
      payload.category = categoryId;
      if (type === 'expense') payload.counts_toward_budget = inBudget;
      if (appliedDiscount) {
        payload.discount_program = appliedDiscount.programId;
        payload.pre_discount_amount = appliedDiscount.original.toFixed(2);
      }
    }

    try {
      if (editing) {
        await update.mutateAsync({ id: transactionId!, input: payload });
      } else {
        const created = await create.mutateAsync(payload);
        if (pendingReceipt) {
          try {
            await uploadReceipt.mutateAsync({ id: created.id, file: pendingReceipt });
          } catch {
            showSnackbar({ message: 'Se guardó, pero no se pudo subir el recibo.' });
          }
        }
      }
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

  if ((editing || duplicateFromId) && existing.isLoading) return <LoadingState />;

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
          <TextInput
            value={formatMoney(amountNum || 0, currency)}
            onChangeText={onAmountKeyPress}
            keyboardType="decimal-pad"
            selectTextOnFocus
            autoFocus={!editing}
            accessibilityLabel="Monto"
            className="text-[40px] leading-[44px]"
            style={{
              color: amountColor,
              fontFamily: fonts.extrabold,
              letterSpacing: -0.8,
              textAlign: 'center',
              minWidth: 120,
            }}
          />
          {fields.amount ? (
            <Text className="text-expense mt-1 text-xs">{fields.amount}</Text>
          ) : null}
        </View>

        {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

        <View className="gap-1">
          <CategoryPickerField
            categories={categoriesQ.data ?? []}
            type={isTransfer ? 'all' : type}
            label={isTransfer ? 'Categoría (opcional)' : 'Categoría'}
            allowClear={isTransfer}
            value={categoryId}
            open={openRow === 'category'}
            onToggle={() => toggleRow('category')}
            onChange={(v) => {
              setCategoryId(v || null);
              setOpenRow(null);
            }}
            loading={categoriesQ.isLoading}
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
                  onPress={() => {
                    haptics.tap();
                    swapWallets();
                  }}
                  accessibilityLabel="Intercambiar carteras"
                  accessibilityRole="button"
                  className="h-8 w-8 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
                >
                  <Icon name="swap" size={15} color={colors.textMuted} />
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

        {benefitLines.length > 0 ? (
          <View className="gap-0.5 rounded-xl bg-income/10 px-3 py-2.5">
            <Text className="text-text-muted text-xs uppercase tracking-wide">Vas a ganar</Text>
            {benefitLines.map((line) => (
              <Text key={line} className="text-text text-sm">
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {showDiscountHint ? (
          <View className="gap-2 rounded-xl bg-income/10 px-3 py-2.5">
            <Text className="text-text text-sm">
              Tenés {(discountRate * 100).toFixed(0)}% de descuento acá
              {activeDiscountProgram?.name ? ` (${activeDiscountProgram.name})` : ''} — con
              descuento: {formatMoney(suggestedAmount, currency)}
            </Text>
            {discountPrograms.length > 1 ? (
              <View className="flex-row flex-wrap gap-2">
                {discountPrograms.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      haptics.selection();
                      setDiscountProgramId(p.id);
                    }}
                    className={`rounded-full border px-3 py-1 ${
                      p.id === discountProgramId ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <Text className="text-text text-xs">{p.name || 'Descuento'}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={applyDiscount}
              className="self-start rounded-full bg-income px-3 py-1.5 active:opacity-70"
              accessibilityRole="button"
            >
              <Text className="text-xs text-white" style={{ fontFamily: fonts.semibold }}>
                Aplicar descuento
              </Text>
            </Pressable>
          </View>
        ) : appliedDiscount ? (
          <View className="flex-row items-center justify-between rounded-xl bg-income/10 px-3 py-2.5">
            <Text className="text-text flex-1 pr-2 text-sm">
              Descuento aplicado: ahorrás{' '}
              {formatMoney(appliedDiscount.original - amountNum, currency)}
            </Text>
            <Pressable onPress={removeDiscount} accessibilityRole="button">
              <Text className="text-primary text-xs" style={{ fontFamily: fonts.semibold }}>
                Quitar
              </Text>
            </Pressable>
          </View>
        ) : null}

        {editing && (existing.data?.loyalty_earnings?.length ?? 0) > 0 ? (
          <View className="gap-1 rounded-xl bg-surface-2 px-3 py-2.5">
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              Recompensas de este movimiento
            </Text>
            {existing.data!.loyalty_earnings.map((e, i) => (
              <Text key={i} className="text-text-muted text-xs">
                {e.kind === 'points'
                  ? `+${toNumber(e.points)} puntos`
                  : e.kind === 'cashback'
                    ? `+${formatMoney(e.amount ?? '0', currency)} cashback`
                    : `Ahorraste ${formatMoney(e.saved_amount ?? '0', currency)} de descuento`}
                {e.program_name ? ` · ${e.program_name}` : ''}
              </Text>
            ))}
          </View>
        ) : null}

        {!isTransfer ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              router.push(`/category/new?type=${type}`);
            }}
            className="flex-row items-center gap-1 self-start py-1 active:opacity-60"
            accessibilityRole="button"
          >
            <Icon name="plus" size={12} color={colors.primary} />
            <Text className="text-primary text-xs" style={{ fontFamily: fonts.semibold }}>
              Nueva categoría
            </Text>
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

        <TagPicker value={tagNames} onChange={setTagNames} />

        <ReceiptField
          transactionId={transactionId}
          hasReceipt={editing && (existing.data?.has_receipt ?? false)}
          pendingFile={pendingReceipt}
          onPendingFileChange={setPendingReceipt}
        />

        {showBudgetSwitch ? (
          <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
            <View className="flex-1 pr-2">
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                Cuenta para el presupuesto
              </Text>
              {/* Una sola línea fija en vez de una que cambia según el estado
                  del switch -- misma info, sin pedir releerla en cada toque. */}
              <Text className="text-text-muted text-xs">Resta del presupuesto si está activo.</Text>
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
            onPress={() => {
              haptics.tap();
              router.push(`/transaction/new?duplicateFrom=${transactionId}`);
            }}
            disabled={busy}
            className="flex-row items-center justify-center gap-1.5 py-2 active:opacity-60"
            accessibilityRole="button"
          >
            <Icon name="copy" size={14} color={colors.primary} />
            <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
              Duplicar transacción
            </Text>
          </Pressable>
        ) : null}

        {editing && !isTransfer && !confirmingDelete ? (
          existing.data?.split_group ? (
            <Text className="text-text-muted text-center text-xs">
              Es parte de una transacción dividida.
            </Text>
          ) : (
            <Pressable
              onPress={() => {
                haptics.tap();
                router.push(`/split-transaction?id=${transactionId}`);
              }}
              disabled={busy}
              className="items-center py-2 active:opacity-60"
              accessibilityRole="button"
            >
              <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                Dividir en varias categorías
              </Text>
            </Pressable>
          )
        ) : null}

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
              Eliminar transacción
            </Text>
          </Pressable>
        ) : null}

        {editing && confirmingDelete ? (
          <View className="gap-2 rounded-2xl bg-expense/10 p-3">
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

      {/* En web hay teclado físico de sobra (y el NumPad se sentía forzado en
      desktop); en nativo lo dejamos para entrada rápida con el pulgar. */}
      {Platform.OS !== 'web' ? <NumPad value={amount} onChange={setAmount} /> : null}
    </View>
  );
}
