import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useRecurringExpenses } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { RECURRENCE_LABEL } from '@/api/types';
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
              const cat = categories.get(r.category);
              const wallet = wallets.get(r.wallet);
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
                    icon={cat?.icon}
                    color={cat?.color}
                    fallbackIcon="repeat"
                    size={40}
                  />
                  <View className="flex-1">
                    <Text
                      className="text-text text-base"
                      style={{ fontFamily: fonts.semibold }}
                      numberOfLines={1}
                    >
                      {cat?.name ?? 'Categoría'}
                      {r.is_active ? '' : ' · pausado'}
                    </Text>
                    <Text className="text-text-muted text-xs" numberOfLines={1}>
                      {RECURRENCE_LABEL[r.frequency]} · {wallet?.name ?? '—'} · próx.{' '}
                      {formatShortDate(r.next_due_date)}
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
