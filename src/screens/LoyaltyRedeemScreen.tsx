import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useCreateLoyaltyMovement, useLoyaltySummary, useWallets } from '@/api/queries';
import { walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { dismissModal } from '@/components/ui/ModalHeader';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { todayISO } from '@/lib/date';
import { formatMoney, toNumber } from '@/lib/money';
import { formatQuantity, parseQuantity, pointsToCash } from '@/lib/rewards';
import { useSnackbarStore } from '@/store/snackbar';

const NO_DEPOSIT = '';

/**
 * Canjear puntos o cashback de una tarjeta: baja el disponible y, si se elige una
 * cartera, registra el ingreso por lo que valió el canje. Un punto vale distinto el día
 * del canje, así que el valor en dinero se puede corregir.
 */
export default function LoyaltyRedeemScreen() {
  const { wallet: walletId, program: programId } = useLocalSearchParams<{ wallet: string; program: string }>();
  const summary = useLoyaltySummary();
  const wallets = useWallets();
  const create = useCreateLoyaltyMovement();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const wallet = summary.data?.wallets.find((w) => w.wallet === walletId);
  const program = wallet?.programs.find((p) => p.program === programId);

  const [quantity, setQuantity] = useState('');
  // Lo que la persona escribió a mano; `null` = se usa el valor sugerido (ver abajo).
  const [cashOverride, setCashOverride] = useState<string | null>(null);
  const [depositTo, setDepositTo] = useState(NO_DEPOSIT);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const isPoints = program?.unit === 'points';
  const qty = parseQuantity(quantity);
  const available = program ? toNumber(program.available) : 0;
  const qtyValid = Number.isFinite(qty) && qty > 0 && qty <= available;

  // Lo que valió el canje: para cashback es lo mismo que se canjea; para puntos se propone
  // con el valor de canje del programa, hasta que la persona lo corrija a mano.
  const suggestedCash = !program || !Number.isFinite(qty) ? null : isPoints ? pointsToCash(qty, program.point_value) : qty;
  const cashValue = cashOverride ?? (suggestedCash == null ? '' : suggestedCash.toFixed(2));

  const cash = parseQuantity(cashValue);
  const needsCash = depositTo !== NO_DEPOSIT;
  const cashValid = !needsCash || (Number.isFinite(cash) && cash > 0);
  const canSubmit = qtyValid && cashValid && !create.isPending;

  async function onSubmit() {
    if (!wallet || !program || !canSubmit) return;
    setFormError(null);
    setFields({});
    try {
      await create.mutateAsync({
        wallet: wallet.wallet,
        program: program.program,
        kind: 'redeem',
        quantity: qty.toFixed(2),
        date,
        note: note.trim(),
        cash_value: isPoints && Number.isFinite(cash) && cash > 0 ? cash.toFixed(2) : undefined,
        deposit_wallet: needsCash ? depositTo : null,
      });
      haptics.success();
      showSnackbar({ message: 'Canje registrado' });
      dismissModal();
    } catch (err) {
      haptics.error();
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo registrar el canje.'));
    }
  }

  const depositOptions = [
    { value: NO_DEPOSIT, label: 'No registrar ingreso', hint: 'Sólo descuenta del disponible' },
    ...(wallets.data ?? []).map((w) => ({ value: w.id, label: walletLabel(w), hint: w.currency })),
  ];

  return (
    <ProFeatureGate feature="loyalty">
      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        {summary.isLoading ? (
          <LoadingState />
        ) : summary.isError ? (
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        ) : !wallet || !program ? (
          <EmptyState title="No se encontró ese programa" />
        ) : (
          <>
            <View>
              <Text className="text-text-muted text-xs uppercase tracking-wide">
                {wallet.wallet_name} · {program.name}
              </Text>
              <Text className="text-text mt-1 text-base">
                Disponible: {formatQuantity(program.unit, program.available, wallet.currency)}
              </Text>
            </View>

            <TextField
              label={isPoints ? 'Puntos a canjear' : `Monto a canjear (${wallet.currency})`}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholder="0"
              error={fields.quantity ?? (quantity && !qtyValid ? `Tiene que estar entre 0 y ${available}` : undefined)}
            />
            <Button
              label="Canjear todo"
              variant="ghost"
              onPress={() => {
                setCashOverride(null);
                setQuantity(String(available));
              }}
            />

            {isPoints ? (
              <TextField
                label={`Lo que valió en dinero (${wallet.currency})`}
                value={cashValue}
                onChangeText={setCashOverride}
                keyboardType="decimal-pad"
                placeholder={program.point_value ? '' : 'Sin valor de canje definido'}
                error={fields.cash_value}
              />
            ) : null}

            <Select
              label="Depositar en"
              value={depositTo}
              options={depositOptions}
              onChange={setDepositTo}
              error={fields.deposit_wallet}
            />
            {needsCash ? (
              <Text className="text-text-muted text-xs">
                Se registra un ingreso de {Number.isFinite(cash) ? formatMoney(cash, wallet.currency) : '—'} en
                esa cartera, en la categoría «Recompensas».
              </Text>
            ) : null}

            <DateField label="Fecha" value={date} onChange={setDate} />
            <TextField label="Nota (opcional)" value={note} onChangeText={setNote} maxLength={200} />

            {qtyValid ? (
              <Text className="text-text-muted text-xs">
                Después del canje te quedan {formatQuantity(program.unit, available - qty, wallet.currency)}.
              </Text>
            ) : null}
            {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}
            <Button label="Canjear" disabled={!canSubmit} loading={create.isPending} onPress={onSubmit} />
          </>
        )}
      </ScrollView>
    </ProFeatureGate>
  );
}
