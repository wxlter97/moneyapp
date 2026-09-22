import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { dismissModal } from '@/components/ui/ModalHeader';

import {
  checkDuplicateTransaction,
  useCardProducts,
  useLoyaltyMerchants,
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useHasFeature,
  useRegisterRefund,
  useTransaction,
  useUpdateTransaction,
  useUploadReceipt,
} from '@/api/queries';
import { useAssignableWallets, walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import type {
  LoyaltyCategoryRate,
  ParseCandidate,
  ReceiptCandidate,
  Transaction,
  TransactionInput,
  TransactionType,
} from '@/api/types';
import { CategoryPickerField } from '@/components/CategoryGrid';
import { ParseTextField } from '@/components/ParseTextField';
import { ReceiptField } from '@/components/ReceiptField';
import { ReceiptScanButton } from '@/components/ReceiptScanButton';
import { TagPicker } from '@/components/TagPicker';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { NumPad } from '@/components/ui/NumPad';
import { PickerRow } from '@/components/ui/PickerRow';
import { Segmented } from '@/components/ui/Segmented';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';
import type { PickedFile } from '@/lib/receipt';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { todayISO } from '@/lib/date';
import { autopayRate, matchMerchant, merchantOptions, pickRate, qualifies } from '@/lib/loyaltyRate';
import { formatMoney, toNumber } from '@/lib/money';
import { useSnackbarStore } from '@/store/snackbar';

/** Precarga sin depender de una Transaction existente -- viene de un ítem
 * "Programado" (recurrente o cuota) que todavía no se registró. */
export interface TransactionPrefill {
  type: TransactionType;
  amount: string;
  categoryId?: string | null;
  walletId: string;
  toWalletId?: string | null;
  date: string;
  note?: string;
}

interface TransactionFormProps {
  transactionId?: string;
  /** Precarga los datos de esta transacción sin editarla: se guarda como una nueva. */
  duplicateFromId?: string;
  /** Precarga desde un ítem "Programado" (ver `TransactionPrefill`). */
  prefill?: TransactionPrefill;
}

type OpenRow = 'category' | 'from' | 'to' | 'refundWallet' | null;

/** Resumen de lo que llenó la IA, ya independiente de por dónde entró. */
interface AIFilledSummary {
  /** Nombres en castellano de los campos de baja confianza, para el aviso. */
  lowConfidence: string[];
  categorySource: 'history' | 'ai' | null;
  duplicates: number;
  items: number;
}

const CAMPOS: Record<string, string> = {
  amount: 'el monto',
  date: 'la fecha',
  merchant: 'el comercio',
};

function lowConfidenceFields(confidence: Record<string, string>): string[] {
  return Object.keys(CAMPOS)
    .filter((field) => confidence[field] === 'low')
    .map((field) => CAMPOS[field]);
}

export function TransactionForm({ transactionId, duplicateFromId, prefill }: TransactionFormProps) {
  const colors = useColors();
  const editing = !!transactionId;
  const sourceId = transactionId ?? duplicateFromId;
  const existing = useTransaction(sourceId);

  const { data: assignableWallets, query: walletsQ } = useAssignableWallets();
  const categoriesQ = useCategories();
  const cardProductsQ = useCardProducts();
  const merchantsQ = useLoyaltyMerchants();
  // El catálogo de tarjetas (`cardProductsQ`) es público -- cualquiera lo lee,
  // pague o no Pro (ver `apps.loyalty.api.IsAdminOrReadOnly`). Sin este
  // chequeo, la vista previa de puntos/cashback de más abajo mostraría
  // "recompensas" en Free igual que si tuviera Pro.
  const hasLoyalty = useHasFeature('loyalty');
  // Gratis restrictivo (22-sep-2026, ver ECONOMIA-POR-PLAN.md): estas cuatro
  // acciones pasaron a requerir Plus -- `!== false` (no `=== true`) para no
  // esconder el botón un instante mientras `useHasFeature` todavía resuelve
  // el plan (mismo fail-open que el resto de la app).
  const canDuplicate = useHasFeature('transaction_duplicate');
  const canRefund = useHasFeature('refunds');
  const canSplitCategories = useHasFeature('split_categories');
  const canSplitPeople = useHasFeature('split_people');
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const uploadReceipt = useUploadReceipt();
  const registerRefund = useRegisterRefund();
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
  const [isRefundable, setIsRefundable] = useState(false);
  const [isAutopay, setIsAutopay] = useState(false);
  const [chosenMerchantId, setChosenMerchantId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Mini-formulario inline de "Registrar reembolso" -- ver más abajo. No es
  // un campo de la transacción: crea OTRA transacción (el ingreso real que
  // devuelve la plata, ver `useRegisterRefund`), así que vive fuera de
  // `payload`/`doSubmit`.
  const [registeringRefund, setRegisteringRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDate, setRefundDate] = useState(todayISO());
  const [refundWalletId, setRefundWalletId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  // Aviso no bloqueante de "esto ya existe" al cargar a mano (ver
  // `checkDuplicateTransaction`) -- sólo al crear, nunca al editar.
  const [duplicateWarning, setDuplicateWarning] = useState<Transaction[] | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [walletDefaulted, setWalletDefaulted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [openRow, setOpenRow] = useState<OpenRow>(null);
  const [pendingReceipt, setPendingReceipt] = useState<PickedFile | null>(null);
  // Lo último que llenó la IA, sea de un recibo o de una frase. Sólo se usa
  // para el resumen de abajo (qué conviene revisar, si esto ya parece
  // registrado): los valores en sí ya están en los campos del formulario,
  // editables como cualquier otro, porque el usuario siempre confirma. Se
  // guarda ya resumido y no la candidata cruda para que el resumen sea uno
  // solo y no uno por cada forma de entrada.
  const [aiFilled, setAiFilled] = useState<AIFilledSummary | null>(null);
  // Por qué canal se llenó esta alta (para el evento `transaction_created` de
  // analítica, ver `docs/backlog-nuevas-funciones.md` punto 4) -- 'manual' es
  // el default, y cambia sólo si una de las entradas de IA la llenó.
  const [entryChannel, setEntryChannel] = useState<'manual' | 'receipt' | 'parse' | 'voice'>(
    'manual',
  );
  // El flujo por defecto es monto + nota + categoría + cartera + fecha + el
  // toggle de presupuesto (cuando aplica); etiquetas y recibo quedan
  // colapsados detrás de "Más detalles" salvo que la transacción que se está
  // editando ya traiga algo ahí adentro (ver el efecto de abajo, corre una
  // vez llega el prefill).
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  // Los tres bloques siguientes ajustan estado durante el render (patrón de React
  // para estado que sigue a datos externos) y no en efectos: cada uno tiene una
  // guarda que se apaga sola tras la primera vez, así que no se repiten, y el
  // formulario no pinta antes una pasada con los valores vacíos.
  if (!(editing || duplicateFromId || !!prefill || walletDefaulted || !defaultWalletId)) {
    setWalletId(defaultWalletId);
    setWalletDefaulted(true);
  }

  if (!((!editing && !duplicateFromId) || prefilled || !existing.data || !categoriesQ.data)) {
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
    // Como `isRefundable`: duplicar un cargo automático no lo copia ya marcado.
    if (editing) {
      setIsAutopay(t.is_autopay ?? false);
      setChosenMerchantId(t.merchant ?? null);
    }
    // Sólo al EDITAR (no al duplicar): duplicar una transacción reembolsada
    // no debería crear la copia ya marcada como reembolsable.
    if (editing) {
      setIsRefundable(t.is_refundable ?? false);
    }
    setPrefilled(true);
    // La nota y el toggle de presupuesto viven arriba, siempre a la vista --
    // no cuentan para decidir si "Más detalles" arranca abierto (ver el
    // bloque de más abajo).
    const hasExtraDetails =
      (t.tags?.length ?? 0) > 0 ||
      t.has_receipt ||
      (t.loyalty_earnings?.length ?? 0) > 0 ||
      t.is_refundable;
    if (hasExtraDetails) setDetailsOpen(true);
  }

  // Viene de tocar un ítem "Programado" (recurrente o cuota): precarga todo
  // para que solo haga falta confirmar y guardar.
  if (!(editing || duplicateFromId || !prefill || prefilled)) {
    setType(prefill.type);
    setAmount(String(Number(prefill.amount).toFixed(2)));
    setCategoryId(prefill.categoryId ?? null);
    setWalletId(prefill.walletId);
    setToWalletId(prefill.toWalletId ?? null);
    setDate(prefill.date);
    setNote(prefill.note ?? '');
    setPrefilled(true);
  }

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

  // El comercio reconocido en la descripción manda sobre la categoría, igual que
  // en el servidor (ver `apps.loyalty.signals`): "Comida" mezcla restaurantes con
  // supermercados.
  // Lo que se elige a mano ("¿fue en Súper Selectos?") gana al que se reconoce en el texto.
  const allMerchants = useMemo(() => merchantsQ.data ?? [], [merchantsQ.data]);
  const merchant =
    allMerchants.find((m) => m.id === chosenMerchantId) ?? matchMerchant(note, allMerchants);
  // Comercios con beneficio en la tarjeta elegida: salen de sus tasas (admin), no de una lista fija.
  const merchantChoices = useMemo(
    () =>
      hasLoyalty && !isTransfer && type === 'expense'
        ? merchantOptions(cardProduct?.programs ?? [], allMerchants)
        : [],
    [hasLoyalty, isTransfer, type, cardProduct, allMerchants],
  );
  // Tasas que sólo valen para cargos automáticos (Pagos Automáticos de servicios):
  // no se pueden deducir de la descripción, así que se PREGUNTA (ver el interruptor
  // más abajo) en vez de suponerlo, y se pregunta también al editar por si quedó mal.
  const categoryTypeForRate = merchant?.category_type ?? selectedCategory?.category_type;
  const autopayOffer = useMemo(() => {
    if (!hasLoyalty || isTransfer || type !== 'expense') return null;
    for (const p of cardProduct?.programs ?? []) {
      if (!p.is_active) continue;
      const rate = autopayRate(p, categoryTypeForRate, merchant?.id);
      if (rate !== undefined) return { program: p, rate: toNumber(rate) };
    }
    return null;
  }, [hasLoyalty, isTransfer, type, cardProduct, categoryTypeForRate, merchant?.id]);
  const autopayOn = !!autopayOffer && isAutopay;

  function rateFor(program: { default_rate: string; category_rates: LoyaltyCategoryRate[] }) {
    return toNumber(pickRate(program, categoryTypeForRate, date, merchant?.id, autopayOn));
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
    hasLoyalty && !editing && !isTransfer && type === 'expense' && amountValid
      ? autoPrograms
          .map((p) => {
            const label = p.name ? ` (${p.name})` : '';
            // "Cashback a partir de $10": por debajo, este programa no gana; se dice
            // por qué en vez de simplemente no mostrar nada.
            if (!qualifies(p, amountNum)) {
              return `Sin ${p.kind === 'points' ? 'puntos' : 'cashback'}${label}: compra mínima ${formatMoney(Number(p.min_amount), currency)}`;
            }
            const rate = rateFor(p);
            if (!rate) return null;
            return p.kind === 'points'
              ? `+${Math.round(amountNum * rate)} puntos${label}`
              : `+${formatMoney(amountNum * rate, currency)} cashback${label}`;
          })
          .filter((x): x is string => x != null)
      : [];

  // Mantiene válida la selección de descuento cuando cambia la cartera o el comercio
  // (ajuste durante el render: cada condición se apaga sola al corregir el estado).
  if (discountPrograms.length === 0) {
    if (discountProgramId) setDiscountProgramId(null);
  } else if (!discountPrograms.some((p) => p.id === discountProgramId)) {
    setDiscountProgramId(discountPrograms[0].id);
  }

  if (appliedDiscount && !discountPrograms.some((p) => p.id === appliedDiscount.programId)) {
    setAppliedDiscount(null);
  }

  const activeDiscountProgram = discountPrograms.find((p) => p.id === discountProgramId) ?? null;
  const discountRate =
    activeDiscountProgram && qualifies(activeDiscountProgram, amountNum)
      ? rateFor(activeDiscountProgram)
      : 0;
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

  /**
   * Vuelca en el formulario lo que la IA leyó del recibo. Todo va a campos
   * normales y editables: la IA llena, el usuario confirma. Nada se guarda
   * acá — el alta pasa por el mismo `doSubmit` de siempre, y el archivo se
   * sube como recibo recién cuando la transacción existe.
   *
   * Lo que no se pudo leer no se pisa: si el monto vino vacío, se deja lo que
   * hubiera (típicamente 0.00) en vez de escribir algo inventado.
   */
  function onScanned(candidate: ReceiptCandidate, file: PickedFile) {
    setEntryChannel('receipt');
    setPendingReceipt(file);
    applyCandidate(candidate);
    setAiFilled({
      lowConfidence: lowConfidenceFields(candidate.confidence),
      categorySource: candidate.category_source,
      duplicates: candidate.possible_duplicates.length,
      items: candidate.items.length,
    });
    // El recibo suele traer el detalle, y verlo ayuda a confirmar que es el
    // que uno cree: se deja abierto para no esconderlo detrás de un toque.
    setDetailsOpen(true);
  }

  /** Lo mismo que `onScanned` pero desde una frase o un dictado. Además puede
   * traer el tipo y la cartera, que un recibo no dice. */
  function onParsed(candidate: ParseCandidate, channel: 'parse' | 'voice') {
    setEntryChannel(channel);
    setType(candidate.type);
    if (candidate.wallet) setWalletId(candidate.wallet);
    applyCandidate(candidate);
    setAiFilled({
      lowConfidence: lowConfidenceFields(candidate.confidence),
      categorySource: candidate.category_source,
      duplicates: candidate.possible_duplicates.length,
      items: 0,
    });
  }

  /** Lo que las dos entradas de IA tienen en común. Lo que no se pudo leer no
   * se pisa: si el monto vino vacío, queda lo que hubiera (típicamente 0.00)
   * en vez de escribir algo inventado. */
  function applyCandidate(candidate: ReceiptCandidate | ParseCandidate) {
    setFormError(null);
    if (candidate.amount) setAmount(Number(candidate.amount).toFixed(2));
    setDate(candidate.date);
    if (candidate.description) setNote(candidate.description);
    if (candidate.category) setCategoryId(candidate.category);
  }

  function onChangeType(next: TransactionType) {
    setType(next);
    setCategoryId(null);
    setOpenRow(null);
    setAppliedDiscount(null);
    // El resumen de lo que llenó la IA habla de lo que había antes: si el
    // usuario cambia el tipo a mano deja de venir al caso (los campos siguen
    // ahí, editables, como cualquier otro dato tipeado).
    setAiFilled(null);
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
    // Sólo se chequea al crear (no al editar, donde comparar contra sí misma
    // no tendría sentido) y sólo la primera vez -- si el usuario ya vio el
    // aviso y decidió guardar igual, no hay que volver a preguntarle.
    if (!editing && !duplicateWarning) {
      setCheckingDuplicate(true);
      try {
        const matches = await checkDuplicateTransaction({
          wallet: walletId,
          amount: amountNum.toFixed(2),
          date,
        });
        if (matches.length > 0) {
          setDuplicateWarning(matches);
          return;
        }
      } catch {
        // Si el chequeo falla, no bloquea el alta -- es sólo una ayuda.
      } finally {
        setCheckingDuplicate(false);
      }
    }
    await doSubmit();
  }

  async function doSubmit() {
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
      payload.is_refundable = isRefundable;
      // Sólo se manda si la tarjeta lo pregunta: sin la pregunta no hay nada que confirmar.
      payload.is_autopay = autopayOn;
      // Sólo si la tarjeta lo ofrece; `null` quita uno elegido antes al editar.
      if (merchantChoices.length > 0) payload.merchant = chosenMerchantId;
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
        track('transaction_created', { channel: entryChannel, type });
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
      setDuplicateWarning(null);
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo guardar la transacción.'));
    }
  }

  function openRefundForm() {
    haptics.tap();
    setRefundAmount(amount);
    setRefundDate(todayISO());
    setRefundWalletId(walletId);
    setRefundError(null);
    setRegisteringRefund(true);
  }

  async function onConfirmRefund() {
    if (!transactionId) return;
    setRefundError(null);
    const value = Number(refundAmount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setRefundError('Ingresá un monto válido.');
      return;
    }
    try {
      await registerRefund.mutateAsync({
        id: transactionId,
        input: { amount: value.toFixed(2), date: refundDate, wallet: refundWalletId ?? undefined },
      });
      haptics.success();
      setRegisteringRefund(false);
    } catch (err) {
      haptics.error();
      setRefundError(errorMessage(err, 'No se pudo registrar el reembolso.'));
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

        {/* Las tres entradas de IA, sólo al crear: llenar el formulario de algo
            que ya existe no tendría sentido. Las tres se esconden solas si el
            backend no tiene IA configurada.

            La frase y el dictado sirven para gasto e ingreso (pueden decir
            "me pagaron"); el escaneo es sólo para gasto, porque un recibo
            nunca es un ingreso ni una transferencia. */}
        {!editing && !isTransfer ? (
          <ParseTextField walletId={walletId} onParsed={(c) => onParsed(c, 'parse')} />
        ) : null}
        {!editing && !isTransfer ? (
          <VoiceInputButton walletId={walletId} onParsed={(c) => onParsed(c, 'voice')} />
        ) : null}
        {!editing && type === 'expense' ? (
          <ReceiptScanButton walletId={walletId} onScanned={onScanned} />
        ) : null}

        {aiFilled ? (
          <FadeInView>
            <View className="gap-1.5 rounded-2xl bg-surface-2 px-3 py-2.5">
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                Listo — revisá antes de guardar
              </Text>
              {aiFilled.lowConfidence.length > 0 ? (
                <Text className="text-warning text-xs">
                  No se leyó bien {aiFilled.lowConfidence.join(' ni ')}: confirmalo vos.
                </Text>
              ) : (
                <Text className="text-text-muted text-xs">
                  Todos los campos se leyeron bien, pero podés cambiar lo que quieras.
                </Text>
              )}
              {aiFilled.categorySource === 'history' ? (
                <Text className="text-text-muted text-xs">
                  La categoría es la que usaste antes en este comercio.
                </Text>
              ) : aiFilled.categorySource === 'ai' ? (
                <Text className="text-text-muted text-xs">Categoría sugerida por la lectura.</Text>
              ) : (
                <Text className="text-text-muted text-xs">Elegí la categoría vos.</Text>
              )}
              {/* Aviso temprano. El chequeo que de verdad frena el guardado
                  sigue siendo el de `onSubmit`, contra el monto y la fecha
                  finales — que para entonces el usuario pudo haber cambiado. */}
              {aiFilled.duplicates > 0 ? (
                <Text className="text-warning text-xs">
                  Ojo: ya hay {aiFilled.duplicates === 1 ? 'una transacción parecida' : `${aiFilled.duplicates} transacciones parecidas`} en esta cartera.
                </Text>
              ) : null}
              {aiFilled.items > 0 ? (
                <Text className="text-text-muted text-xs">
                  {aiFilled.items} {aiFilled.items === 1 ? 'renglón leído' : 'renglones leídos'} del detalle.
                </Text>
              ) : null}
            </View>
          </FadeInView>
        ) : null}

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

        <TextField
          label="Nota (opcional)"
          placeholder="Descripción"
          value={note}
          onChangeText={setNote}
          error={fields.description}
        />

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
                <IconButton
                  icon="swap"
                  size={32}
                  iconSize={15}
                  color={colors.textMuted}
                  onPress={swapWallets}
                  accessibilityLabel="Intercambiar carteras"
                  className="rounded-full bg-surface-2 active:opacity-70"
                />
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

        {merchantChoices.length > 0 ? (
          <View className="gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
            <View>
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                ¿Fue en alguno de estos comercios?
              </Text>
              <Text className="text-text-muted text-xs">
                Tu tarjeta da un beneficio especial ahí. Si no lo eliges, se busca por lo que
                escribas en la descripción.
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {merchantChoices.map((m) => {
                const selected = merchant?.id === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      haptics.selection();
                      setChosenMerchantId(chosenMerchantId === m.id ? null : m.id);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`rounded-full border px-3 py-1 ${
                      selected ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <Text className="text-text text-xs">{m.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {autopayOffer ? (
          <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
            <View className="flex-1 pr-2">
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                ¿Es un cargo automático?
              </Text>
              <Text className="text-text-muted text-xs">
                Pagos Automáticos de servicios: {autopayOffer.program.name || 'esta tarjeta'} da{' '}
                {autopayOffer.program.kind === 'points'
                  ? `${autopayOffer.rate} puntos por unidad`
                  : `${(autopayOffer.rate * 100).toFixed(0)}%`}{' '}
                sólo así.
              </Text>
            </View>
            <Switch
              value={isAutopay}
              onValueChange={setIsAutopay}
              trackColor={{ true: colors.primary, false: colors.surface2 }}
              thumbColor="#FFFFFF"
            />
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

        {showBudgetSwitch ? (
          <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
            <View className="flex-1 pr-2">
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                Cuenta para el presupuesto
              </Text>
              {/* Una sola línea fija en vez de una que cambia según el
                  estado del switch -- misma info, sin pedir releerla
                  en cada toque. */}
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

        {/* Con esto el alta por defecto queda en monto + nota + categoría +
            cartera + fecha + el toggle de presupuesto (cuando aplica) --
            etiquetas y recibo (opcionales en la inmensa mayoría de los
            movimientos) quedan un toque más allá en vez de siempre a la
            vista. */}
        <Pressable
          onPress={() => {
            haptics.tap();
            setDetailsOpen((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          className="flex-row items-center gap-1.5 self-start py-1 active:opacity-60"
        >
          <Text className="text-text-muted text-sm" style={{ fontFamily: fonts.semibold }}>
            Más detalles
          </Text>
          <Icon
            name={detailsOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textMuted}
          />
        </Pressable>

        {detailsOpen ? (
          <FadeInView>
            <View className="gap-4">
              {!isTransfer ? (
                <View className="gap-2">
                  <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                    <View className="flex-1 pr-2">
                      <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                        Reembolsable
                      </Text>
                      <Text className="text-text-muted text-xs">
                        Esperás recuperar este gasto (seguro, trabajo, un adelanto...).
                      </Text>
                    </View>
                    <Switch
                      value={isRefundable}
                      onValueChange={setIsRefundable}
                      trackColor={{ true: colors.primary, false: colors.surface2 }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              ) : null}

              <TagPicker value={tagNames} onChange={setTagNames} />

              <ReceiptField
                transactionId={transactionId}
                hasReceipt={editing && (existing.data?.has_receipt ?? false)}
                pendingFile={pendingReceipt}
                onPendingFileChange={setPendingReceipt}
              />

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
            </View>
          </FadeInView>
        ) : null}

        {duplicateWarning ? (
          <View className="gap-2 rounded-2xl bg-warning/10 p-3">
            <Text className="text-text text-sm">
              {duplicateWarning.length === 1
                ? 'Ya existe una transacción parecida'
                : `Ya existen ${duplicateWarning.length} transacciones parecidas`}{' '}
              (misma cartera, monto y fecha cercana). ¿Registrar de todas formas?
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Cancelar" variant="ghost" onPress={() => setDuplicateWarning(null)} />
              </View>
              <View className="flex-1">
                <Button
                  label="Guardar igual"
                  loading={create.isPending || update.isPending}
                  onPress={doSubmit}
                />
              </View>
            </View>
          </View>
        ) : (
          <Button
            label={editing ? 'Guardar cambios' : 'Guardar'}
            loading={checkingDuplicate || create.isPending || update.isPending}
            disabled={!canSubmit}
            onPress={onSubmit}
          />
        )}

        {editing && !confirmingDelete && canDuplicate !== false ? (
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

        {editing && type === 'expense' && !confirmingDelete && (existing.data?.is_refunded || canRefund !== false) ? (
          existing.data?.is_refunded ? (
            <Pressable
              onPress={() => {
                haptics.tap();
                if (existing.data?.refund_transaction_id) {
                  router.push(`/transaction/${existing.data.refund_transaction_id}`);
                }
              }}
              className="flex-row items-center justify-center gap-1.5 py-2 active:opacity-60"
              accessibilityRole="button"
            >
              <Icon name="reset" size={14} color={colors.income} />
              <Text className="text-income text-sm" style={{ fontFamily: fonts.semibold }}>
                Ver reembolso registrado
              </Text>
            </Pressable>
          ) : registeringRefund ? (
            <View className="gap-3 rounded-2xl bg-income/10 p-3">
              <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                Registrar reembolso
              </Text>
              <TextField
                label="Monto recibido"
                keyboardType="decimal-pad"
                value={refundAmount}
                onChangeText={setRefundAmount}
              />
              <DateField label="Fecha" value={refundDate} onChange={setRefundDate} />
              <PickerRow
                label="Acreditar a"
                options={walletOptions}
                value={refundWalletId}
                onChange={(v) => {
                  setRefundWalletId(v);
                  setOpenRow(null);
                }}
                open={openRow === 'refundWallet'}
                onToggle={() => toggleRow('refundWallet')}
              />
              {refundError ? <Text className="text-expense text-xs">{refundError}</Text> : null}
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Cancelar"
                    variant="ghost"
                    onPress={() => setRegisteringRefund(false)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Confirmar"
                    loading={registerRefund.isPending}
                    onPress={onConfirmRefund}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={openRefundForm}
              disabled={busy}
              className="flex-row items-center justify-center gap-1.5 py-2 active:opacity-60"
              accessibilityRole="button"
            >
              <Icon name="reset" size={14} color={colors.primary} />
              <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                Registrar reembolso
              </Text>
            </Pressable>
          )
        ) : null}

        {editing && !isTransfer && !confirmingDelete && canSplitCategories !== false ? (
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

        {editing && !isTransfer && !confirmingDelete && canSplitPeople !== false ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              router.push(`/split-people?id=${transactionId}`);
            }}
            disabled={busy}
            className="items-center gap-0.5 py-2 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
              {(existing.data?.shares?.length ?? 0) > 0
                ? 'Editar división entre personas'
                : 'Dividir entre personas'}
            </Text>
            {/* No confundir con "Dividir en varias categorías" de arriba: no
                toca el monto/categoría de esta transacción, sólo registra
                quién puso el dinero y cuánto le debe cada quién. */}
            <Text className="text-text-muted text-center text-xs">
              Registrar quién pagó y cuánto le debe cada uno (no cambia esta transacción)
            </Text>
          </Pressable>
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
