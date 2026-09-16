import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useCreatePerson, usePeople, usePersonBalances } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * Quién le debe cuánto a quién entre transacciones divididas por persona
 * (ver TransactionForm → "Dividir entre personas"), ya neteado por par --
 * y la lista de personas del workspace, para darlas de alta de antemano en
 * vez de sólo al vuelo al dividir una transacción.
 */
export default function BalancesScreen() {
  const colors = useColors();
  const balancesQ = usePersonBalances();
  const peopleQ = usePeople();
  const createPerson = useCreatePerson();
  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const refresh = usePullRefresh(
    (balancesQ.isFetching || peopleQ.isFetching) && !balancesQ.isLoading && !peopleQ.isLoading,
    () => {
      balancesQ.refetch();
      peopleQ.refetch();
    },
  );

  async function onCreate() {
    const name = draft.trim();
    if (!name) return;
    setDraftError(null);
    try {
      await createPerson.mutateAsync(name);
      setDraft('');
      setAdding(false);
      haptics.success();
    } catch (err) {
      setDraftError(errorMessage(err, 'No se pudo agregar a la persona.'));
    }
  }

  const balances = balancesQ.data ?? [];
  const people = (peopleQ.data ?? []).filter((p) => !p.is_me);

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Personas" />
      <Pressable
        onPress={() => {
          haptics.tap();
          setAdding((v) => !v);
        }}
        className="flex-row items-center gap-1 self-end rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
        accessibilityRole="button"
      >
        <Icon name="plus" size={13} color={colors.primary} />
        <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
          Nueva
        </Text>
      </Pressable>

      <ScrollView
        contentContainerClassName="gap-3 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        {adding ? (
          <Card>
            <View className="flex-row items-center gap-2">
              <TextInput
                autoFocus
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={onCreate}
                placeholder="Nombre de la persona"
                maxLength={100}
                className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-text"
              />
              <Pressable
                onPress={onCreate}
                disabled={!draft.trim() || createPerson.isPending}
                className="bg-primary h-11 items-center justify-center rounded-xl px-4 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-primary-fg text-sm" style={{ fontFamily: fonts.semibold }}>
                  Crear
                </Text>
              </Pressable>
            </View>
            {draftError ? <Text className="text-expense mt-2 text-xs">{draftError}</Text> : null}
          </Card>
        ) : null}

        <Card title="Saldos">
          {balancesQ.isLoading ? (
            <LoadingState />
          ) : balancesQ.isError ? (
            <ErrorState error={balancesQ.error} onRetry={balancesQ.refetch} />
          ) : balances.length === 0 ? (
            <Text className="text-text-muted py-2 text-sm">
              Nadie le debe nada a nadie por ahora.
            </Text>
          ) : (
            <View className="gap-3">
              {balances.map((b) => (
                <View key={`${b.from_person.id}-${b.to_person.id}`} className="flex-row items-center gap-2">
                  <Text className="text-text flex-1 text-sm" numberOfLines={2}>
                    <Text style={{ fontFamily: fonts.semibold }}>
                      {b.from_person.is_me ? 'Vos' : b.from_person.name}
                    </Text>
                    {' le debés a '}
                    <Text style={{ fontFamily: fonts.semibold }}>
                      {b.to_person.is_me ? 'vos' : b.to_person.name}
                    </Text>
                  </Text>
                  <Money value={b.amount} currency={currency} className="font-semibold" />
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card title="Gente">
          {peopleQ.isLoading ? (
            <LoadingState />
          ) : people.length === 0 ? (
            <EmptyState
              title="Sin gente todavía"
              hint="Se agregan acá, o directamente al dividir una transacción entre personas."
            />
          ) : (
            <View>
              {people.map((person, i) => (
                <View
                  key={person.id}
                  className={`flex-row items-center gap-2 py-2.5 ${i === 0 ? '' : 'border-t border-border/30'}`}
                >
                  <Icon name="users" size={16} color={colors.textMuted} />
                  <Text className="text-text flex-1 text-sm" numberOfLines={1}>
                    {person.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
