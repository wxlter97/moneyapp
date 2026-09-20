import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import {
  useCreateLoyaltyMovement,
  useLoyaltyMovements,
  useLoyaltySummary,
  useUpdateLoyaltyMovement,
} from '@/api/queries';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { LoyaltyMovement, LoyaltyProgramBalance, LoyaltyWalletBalance } from '@/api/types';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { dismissModal } from '@/components/ui/ModalHeader';
import { Segmented } from '@/components/ui/Segmented';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { todayISO } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { adjustmentToReach, formatQuantity, parseQuantity } from '@/lib/rewards';
import { useSnackbarStore } from '@/store/snackbar';

type Mode = 'set' | 'add' | 'sub';

/**
 * Ajustar el disponible de un programa cuando no coincide con lo que dice el banco: fijarlo
 * en una cifra, o sumar / restar. Nunca sobrescribe el saldo: queda un renglón en el libro
 * (con su motivo) que se puede corregir o deshacer. Con `?movement=` edita uno existente:
 * la cantidad sólo en un ajuste; de un canje, la nota y la fecha.
 */
export default function LoyaltyAdjustScreen() {
  const {
    wallet: walletId,
    program: programId,
    movement: movementId,
  } = useLocalSearchParams<{ wallet: string; program: string; movement?: string }>();
  const summary = useLoyaltySummary();
  const movements = useLoyaltyMovements(movementId ? walletId : undefined);

  const wallet = summary.data?.wallets.find((w) => w.wallet === walletId);
  const program = wallet?.programs.find((p) => p.program === programId);
  const movement = movementId ? movements.data?.find((m) => m.id === movementId) : undefined;
  const editing = !!movementId;

  return (
    <ProFeatureGate feature="loyalty">
      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        {summary.isLoading || (editing && movements.isLoading) ? (
          <LoadingState />
        ) : summary.isError ? (
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        ) : !wallet || !program || (editing && !movement) ? (
          <EmptyState title="No se encontró ese programa" />
        ) : (
          // Con `key` el formulario arranca de nuevo si cambia el movimiento: los valores
          // iniciales se toman al montarse, sin efectos que los copien después.
          <AdjustForm key={movement?.id ?? 'new'} wallet={wallet} program={program} movement={movement} />
        )}
      </ScrollView>
    </ProFeatureGate>
  );
}

function AdjustForm({
  wallet,
  program,
  movement,
}: {
  wallet: LoyaltyWalletBalance;
  program: LoyaltyProgramBalance;
  movement?: LoyaltyMovement;
}) {
  const create = useCreateLoyaltyMovement();
  const update = useUpdateLoyaltyMovement();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const editing = !!movement;
  const isRedeem = movement?.kind === 'redeem';
  const initialDelta = movement ? toNumber(movement.delta) : 0;

  const [mode, setMode] = useState<Mode>(movement ? (initialDelta < 0 ? 'sub' : 'add') : 'set');
  const [amount, setAmount] = useState(movement ? String(Math.abs(initialDelta)) : '');
  const [date, setDate] = useState(movement?.date ?? todayISO());
  const [note, setNote] = useState(movement?.note ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const available = toNumber(program.available);
  const typed = parseQuantity(amount);
  // Lo que se guarda: con signo. En "fijar", la diferencia contra lo que hay hoy; al editar, el
  // disponible sin este mismo ajuste es la base (para que "fijar" no cuente el ajuste dos veces).
  const base = editing && movement ? available - toNumber(movement.delta) : available;
  const delta = !Number.isFinite(typed)
    ? NaN
    : mode === 'set'
      ? adjustmentToReach(base, typed)
      : mode === 'add'
        ? typed
        : -typed;
  const resulting = base + (Number.isFinite(delta) ? delta : 0);
  const deltaValid = Number.isFinite(delta) && delta !== 0 && resulting >= 0;
  const canSubmit = editing && isRedeem ? !update.isPending : deltaValid && !update.isPending && !create.isPending;

  async function onSubmit() {
    if (!canSubmit) return;
    setFormError(null);
    setFields({});
    try {
      if (movement) {
        await update.mutateAsync({
          id: movement.id,
          input: isRedeem
            ? { date, note: note.trim() }
            : { quantity: delta.toFixed(2), date, note: note.trim() },
        });
      } else {
        await create.mutateAsync({
          wallet: wallet.wallet,
          program: program.program,
          kind: 'adjust',
          quantity: delta.toFixed(2),
          date,
          note: note.trim(),
        });
      }
      haptics.success();
      showSnackbar({ message: editing ? 'Movimiento actualizado' : 'Ajuste registrado' });
      dismissModal();
    } catch (err) {
      haptics.error();
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo guardar.'));
    }
  }

  const label = program.unit === 'points' ? 'puntos' : `dinero (${wallet.currency})`;

  return (
    <>
      <View>
        <Text className="text-text-muted text-xs uppercase tracking-wide">
          {wallet.wallet_name} · {program.name}
        </Text>
        <Text className="text-text mt-1 text-base">
          Disponible hoy: {formatQuantity(program.unit, program.available, wallet.currency)}
        </Text>
      </View>

      {editing && isRedeem ? (
        <Text className="text-text-muted text-xs">
          La cantidad de un canje no se cambia: si te equivocaste, deshazlo y vuelve a canjear. Aquí puedes
          corregir la fecha y la nota.
        </Text>
      ) : (
        <>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'set', label: 'Fijar en' },
              { value: 'add', label: 'Sumar' },
              { value: 'sub', label: 'Restar' },
            ]}
          />
          <TextField
            label={
              mode === 'set'
                ? `Disponible correcto (${label})`
                : mode === 'add'
                  ? `Cuánto sumar (${label})`
                  : `Cuánto restar (${label})`
            }
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            error={fields.quantity}
          />
          {Number.isFinite(delta) ? (
            delta === 0 ? (
              <Text className="text-text-muted text-xs">No hay nada que ajustar.</Text>
            ) : resulting < 0 ? (
              <Text className="text-expense text-xs">El disponible no puede quedar en negativo.</Text>
            ) : (
              <Text className="text-text-muted text-xs">
                Ajuste de {delta > 0 ? '+' : ''}
                {formatQuantity(program.unit, delta, wallet.currency)}. Quedarían{' '}
                {formatQuantity(program.unit, resulting, wallet.currency)}.
              </Text>
            )
          ) : null}
        </>
      )}

      <DateField label="Fecha" value={date} onChange={setDate} />
      <TextField
        label="Motivo (opcional)"
        value={note}
        onChangeText={setNote}
        maxLength={200}
        placeholder="Ej.: mi banco dice 12,400"
        error={fields.note}
      />
      {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}
      <Button
        label={editing ? 'Guardar' : 'Registrar ajuste'}
        disabled={!canSubmit}
        loading={create.isPending || update.isPending}
        onPress={onSubmit}
      />
    </>
  );
}
