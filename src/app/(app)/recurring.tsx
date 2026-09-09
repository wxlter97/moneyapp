import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  useCreateRecurringExpense,
  useDismissRecurringSuggestion,
  useRecurringExpenses,
  useRecurringSuggestions,
} from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { RECURRENCE_LABEL, type RecurringSuggestion } from '@/api/types';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { formatShortDate } from '@/lib/date';

export default function RecurringScreen() {
  const colors = useColors();
  const q = useRecurringExpenses();
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();

  const items = useMemo(
    () =>
      [...(q.data ?? [])].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)),
    [q.data],
  );

  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Recurrentes" />
      <Pressable
        onPress={() => {
          haptics.tap();
          router.push('/recurring/new');
        }}
        className="flex-row items-center gap-1 self-end rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
        accessibilityRole="button"
      >
        <Icon name="plus" size={13} color={colors.primary} />
        <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
          Nuevo
        </Text>
      </Pressable>

      <ScrollView
        contentContainerClassName="gap-3 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        <RecurringSuggestions />

        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin recurrentes"
            hint="Añade tus suscripciones y pagos fijos para verlos en Programado."
          />
        ) : (
          <Card>
            {items.map((r, i) => {
              const isTransfer = r.type === 'transfer';
              const cat = r.category ? categories.get(r.category) : undefined;
              const wallet = wallets.get(r.wallet);
              const toWallet = r.to_wallet ? wallets.get(r.to_wallet) : undefined;
              const title = r.name || (isTransfer ? `Transferencia a ${toWallet?.name ?? '—'}` : cat?.name) || 'Categoría';
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    haptics.tap();
                    router.push(`/recurring/${r.id}`);
                  }}
                  className={`flex-row items-center gap-3 py-3 active:opacity-60 ${
                    i > 0 ? 'border-t border-border/30' : ''
                  }`}
                  accessibilityRole="button"
                >
                  <CategoryAvatar
                    icon={isTransfer ? undefined : cat?.icon}
                    color={isTransfer ? undefined : cat?.color}
                    fallbackIcon={isTransfer ? 'swap' : 'repeat'}
                    size={40}
                  />
                  <View className="flex-1">
                    <Text
                      className="text-text text-base"
                      style={{ fontFamily: fonts.semibold }}
                      numberOfLines={1}
                    >
                      {title}
                      {r.is_active ? '' : ' · pausado'}
                    </Text>
                    <Text className="text-text-muted text-xs" numberOfLines={1}>
                      {RECURRENCE_LABEL[r.frequency]} ·{' '}
                      {isTransfer ? `${wallet?.name ?? '—'} → ${toWallet?.name ?? '—'}` : (wallet?.name ?? '—')} ·
                      próx. {formatShortDate(r.next_due_date)}
                    </Text>
                  </View>
                  <Money value={r.amount} currency={wallet?.currency ?? 'USD'} className="text-sm font-semibold" />
                </Pressable>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function suggestionKey(s: RecurringSuggestion) {
  return `${s.category}-${s.wallet}-${s.suggested_amount}`;
}

/**
 * "¿Esto es recurrente?" -- candidatas detectadas en el historial (misma
 * categoría+cartera, monto parecido, varios meses seguidos) que todavía no
 * están marcadas como recurrentes. Ver `services.detect_recurring_candidates`
 * en el backend.
 */
function RecurringSuggestions() {
  const q = useRecurringSuggestions();
  const { map: wallets } = useWalletMap();
  const createRec = useCreateRecurringExpense();
  const dismiss = useDismissRecurringSuggestion();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const suggestions = q.data ?? [];
  if (q.isLoading || q.isError || suggestions.length === 0) return null;

  async function accept(s: RecurringSuggestion) {
    const key = suggestionKey(s);
    haptics.tap();
    setBusyKey(key);
    try {
      await createRec.mutateAsync({
        category: s.category,
        wallet: s.wallet,
        amount: s.suggested_amount,
        frequency: 'monthly',
        next_due_date: s.suggested_next_due_date,
      });
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setBusyKey(null);
    }
  }

  async function decline(s: RecurringSuggestion) {
    const key = suggestionKey(s);
    haptics.tap();
    setBusyKey(key);
    try {
      await dismiss.mutateAsync({ category: s.category, wallet: s.wallet, amount: s.suggested_amount });
    } catch {
      haptics.error();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Card title="¿Esto es recurrente?">
      {suggestions.map((s, i) => {
        const key = suggestionKey(s);
        const busy = busyKey === key;
        return (
          <View key={key} className={`gap-2.5 py-3 ${i > 0 ? 'border-t border-border/30' : ''}`}>
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <Text
                  className="text-text text-sm"
                  style={{ fontFamily: fonts.semibold }}
                  numberOfLines={1}
                >
                  {s.category_name}
                </Text>
                <Text className="text-text-muted text-xs" numberOfLines={1}>
                  {s.wallet_name} · se repitió {s.occurrences} meses seguidos
                </Text>
              </View>
              <Money
                value={s.suggested_amount}
                currency={wallets.get(s.wallet)?.currency ?? 'USD'}
                className="text-sm font-semibold"
              />
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => decline(s)}
                disabled={busy}
                accessibilityRole="button"
                className="flex-1 items-center rounded-xl bg-surface-2 py-2.5 active:opacity-70"
              >
                <Text className="text-text-muted text-sm">No, gracias</Text>
              </Pressable>
              <Pressable
                onPress={() => accept(s)}
                disabled={busy}
                accessibilityRole="button"
                className="bg-primary flex-1 items-center rounded-xl py-2.5 active:opacity-70"
              >
                <Text className="text-primary-fg text-sm" style={{ fontFamily: fonts.semibold }}>
                  Marcar como recurrente
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
