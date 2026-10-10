import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  useCreatePerson,
  usePeople,
  useSplitTransactionPeople,
  useTransaction,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { Person } from '@/api/types';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Money } from '@/components/ui/Money';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { notifyError } from '@/lib/notifyError';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const ME = '__me__';

interface ParticipantDraft {
  key: string;
  /** ID de un Person existente, o `null` mientras no se eligió nadie. */
  personId: string | null;
  amount: string;
}

let nextKey = 0;
function emptyParticipant(): ParticipantDraft {
  return { key: String(nextKey++), personId: null, amount: '0.00' };
}

/** Chip seleccionable de persona + un chip final "Agregar" que abre un campo
 * de texto para dar de alta a alguien nuevo (amigo sin cuenta en la app). */
function PersonChips({
  people,
  value,
  onChange,
  excludeIds,
}: {
  people: Person[];
  value: string | null;
  onChange: (id: string) => void;
  excludeIds: string[];
}) {
  const colors = useColors();
  const createPerson = useCreatePerson();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const options = people.filter((p) => !excludeIds.includes(p.id) || p.id === value);

  async function submitNewPerson() {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    try {
      const created = await createPerson.mutateAsync(name);
      onChange(created.id);
    } catch (err) {
      notifyError(err, 'No se pudo agregar a la persona.');
    } finally {
      setNewName('');
      setAdding(false);
    }
  }

  return (
    <View className="-m-1 flex-row flex-wrap items-center">
      {options.map((person) => {
        const active = person.id === value;
        return (
          <View key={person.id} className="p-1">
            <Pressable
              onPress={() => {
                haptics.tap();
                onChange(person.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`rounded-full border px-3 py-2 active:opacity-70 ${
                active ? 'border-primary bg-primary/10' : 'border-border bg-surface'
              }`}
            >
              <Text
                className={active ? 'text-primary text-sm' : 'text-text text-sm'}
                style={active ? { fontFamily: fonts.semibold } : undefined}
              >
                {person.is_me ? 'Yo' : person.name}
              </Text>
            </Pressable>
          </View>
        );
      })}
      {adding ? (
        <View className="p-1">
          <TextInput
            autoFocus
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={submitNewPerson}
            onBlur={submitNewPerson}
            placeholder="Nombre"
            placeholderTextColor={colors.textMuted}
            className="text-text rounded-full border border-primary bg-surface px-3 py-2 text-sm"
            style={{ minWidth: 100 }}
          />
        </View>
      ) : (
        <View className="p-1">
          <Pressable
            onPress={() => setAdding(true)}
            accessibilityRole="button"
            accessibilityLabel="Agregar una persona nueva"
            className="flex-row items-center gap-1 rounded-full border border-dashed border-border bg-surface px-3 py-2 active:opacity-70"
          >
            <Icon name="plus" size={13} color={colors.textMuted} />
            <Text className="text-text-muted text-sm">Agregar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * Divide una transacción entre varias personas: quién puso el dinero y
 * cuánto le toca a cada uno de los demás -- lo que no se asigna queda como
 * la parte implícita de quien pagó (ver TransactionViewSet.split_people).
 */
export default function SplitPeopleScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const txnQ = useTransaction(id);
  const peopleQ = usePeople();
  const splitMutation = useSplitTransactionPeople();

  const [paidBy, setPaidBy] = useState<string>(ME);
  const [participants, setParticipants] = useState<ParticipantDraft[]>(() => [emptyParticipant()]);
  const [error, setError] = useState<string | null>(null);
  // HALLAZGO: esta pantalla arrancaba siempre en blanco (un participante
  // vacío, "Yo" como pagador), incluso al abrir "Editar división entre
  // personas" -- nunca leía `txn.shares`/`txn.paid_by`, así que "Guardar"
  // pisaba la división existente con datos vacíos en vez de dejar
  // ajustarla. Se hidrata una sola vez, cuando ya llegaron tanto la
  // transacción como la lista de personas (para poder reconocer si
  // `paid_by` es la fila "Yo").
  const [hydrated, setHydrated] = useState(false);

  const txn = txnQ.data;
  const people = useMemo(() => peopleQ.data ?? [], [peopleQ.data]);

  // Se hidrata una vez, durante el render, cuando llegan la transacción y las personas.
  if (!hydrated && txn && !peopleQ.isLoading) {
    if ((txn.shares?.length ?? 0) > 0) {
      const payer = people.find((p) => p.id === txn.paid_by);
      setPaidBy(payer?.is_me ? ME : (txn.paid_by ?? ME));
      setParticipants(
        txn.shares.map((s) => ({
          key: String(nextKey++),
          personId: s.person,
          amount: String(Number(s.amount).toFixed(2)),
        })),
      );
    }
    setHydrated(true);
  }
  const total = toNumber(txn?.amount);
  const assigned = participants.reduce((sum, p) => sum + toNumber(p.amount), 0);
  const myShare = Math.round((total - assigned) * 100) / 100;

  const payerOptions: Person[] = [
    { id: ME, name: 'Yo', member: null, is_me: true, created_at: '' },
    ...people.filter((p) => !p.is_me),
  ];

  function updateParticipant(key: string, patch: Partial<ParticipantDraft>) {
    setParticipants((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function addParticipant() {
    haptics.tap();
    setParticipants((prev) => [...prev, emptyParticipant()]);
  }

  function removeParticipant(key: string) {
    haptics.tap();
    setParticipants((prev) => (prev.length > 1 ? prev.filter((p) => p.key !== key) : prev));
  }

  const chosenIds = participants.map((p) => p.personId).filter((v): v is string => !!v);
  const canSubmit =
    !!txn &&
    total > 0 &&
    assigned > 0 &&
    myShare >= 0 &&
    participants.every((p) => !!p.personId && toNumber(p.amount) > 0) &&
    new Set(chosenIds).size === chosenIds.length;

  async function onSubmit() {
    if (!id || !canSubmit) return;
    setError(null);
    try {
      await splitMutation.mutateAsync({
        id,
        input: {
          paid_by: paidBy === ME ? undefined : paidBy,
          participants: participants.map((p) => ({
            person: p.personId!,
            amount: toNumber(p.amount).toFixed(2),
          })),
        },
      });
      haptics.success();
      router.back();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo dividir la transacción entre personas.'));
    }
  }

  if (txnQ.isError || peopleQ.isError) {
    return (
      <Screen edges={['top', 'bottom']} variant="drawer">
        <ModalHeader title="Dividir entre personas" />
        <ErrorState
          error={txnQ.error ?? peopleQ.error}
          onRetry={() => {
            txnQ.refetch();
            peopleQ.refetch();
          }}
        />
      </Screen>
    );
  }

  if (txnQ.isLoading || peopleQ.isLoading) {
    return (
      <Screen edges={['top', 'bottom']} variant="drawer">
        <ModalHeader title="Dividir entre personas" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']} variant="drawer">
      <ModalHeader title="Dividir entre personas" />
      <ScrollView contentContainerClassName="gap-3 py-2" keyboardShouldPersistTaps="handled">
        <Card>
          <Text className="text-text-muted text-sm" numberOfLines={1}>
            {txn?.description || 'Transacción'}
          </Text>
          <Money value={txn?.amount} currency={txn?.currency} className="text-2xl font-semibold" />
        </Card>

        <Text className="text-text-muted px-1 text-xs leading-4">
          Esto NO cambia el monto ni la categoría de esta transacción — sólo registra quién puso
          el dinero y cuánto le toca devolver a cada uno de los demás. Lo que no le asignes a
          nadie queda como la parte de quien pagó. Se refleja en Herramientas → Personas.
        </Text>

        <Card title="¿Quién pagó?">
          <PersonChips people={payerOptions} value={paidBy} onChange={setPaidBy} excludeIds={[]} />
        </Card>

        {participants.map((participant, i) => (
          <Card
            key={participant.key}
            title={`Persona ${i + 1}`}
            action={
              participants.length > 1 ? (
                <IconButton
                  icon="trash"
                  size={20}
                  iconSize={16}
                  color={colors.textMuted}
                  accessibilityLabel="Quitar esta persona"
                  onPress={() => removeParticipant(participant.key)}
                />
              ) : undefined
            }
          >
            <View className="gap-3">
              <PersonChips
                people={people.filter((p) => !p.is_me)}
                value={participant.personId}
                onChange={(v) => updateParticipant(participant.key, { personId: v })}
                excludeIds={chosenIds.filter((cid) => cid !== participant.personId)}
              />
              <AmountInput
                label="Su parte"
                currency={txn?.currency}
                value={participant.amount}
                onChangeText={(v) => updateParticipant(participant.key, { amount: v })}
              />
            </View>
          </Card>
        ))}

        <Pressable
          onPress={addParticipant}
          accessibilityRole="button"
          className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 active:opacity-70"
        >
          <Icon name="plus" size={16} color={colors.textMuted} />
          <Text className="text-text-muted text-sm">Agregar otra persona</Text>
        </Pressable>

        <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <Text className="text-text-muted text-sm">Tu parte (lo que no se asignó)</Text>
          <Money
            value={myShare.toFixed(2)}
            currency={txn?.currency}
            tone={myShare < 0 ? 'expense' : 'muted'}
            className="text-base font-semibold"
          />
        </View>
        {myShare < 0 ? (
          <Text className="text-expense px-1 text-xs">
            Lo asignado a los demás no puede superar el monto total.
          </Text>
        ) : null}

        {error ? <Text className="text-expense px-1 text-xs">{error}</Text> : null}

        <Button
          label="Dividir entre personas"
          loading={splitMutation.isPending}
          disabled={!canSubmit}
          onPress={onSubmit}
        />
      </ScrollView>
    </Screen>
  );
}
