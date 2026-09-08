import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useInstallments } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { formatShortDate } from '@/lib/date';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * Compras a plazo: son puro cálculo sobre los cortes de la tarjeta (no hay
 * "registrar cuota" -- ver `apps.accounts.services.installment_status` en
 * el backend). Esta lista solo muestra en qué van.
 */
export default function InstallmentsScreen() {
  const colors = useColors();
  const q = useInstallments();
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();

  const items = useMemo(
    () =>
      [...(q.data ?? [])].sort(
        (a, b) => Number(a.is_completed) - Number(b.is_completed) || a.description.localeCompare(b.description),
      ),
    [q.data],
  );

  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Compras a plazo" />
      <Pressable
        onPress={() => {
          haptics.tap();
          router.push('/installment/new');
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
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin compras a plazo"
            hint="Registra una compra en cuotas para seguir cuánto te falta."
          />
        ) : (
          items.map((p) => {
            const cat = categories.get(p.category);
            const wallet = wallets.get(p.wallet);
            const currency = wallet?.currency ?? 'USD';
            const progress = p.installments_total
              ? p.installments_paid / p.installments_total
              : 0;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  haptics.tap();
                  router.push(`/installment/${p.id}`);
                }}
                className="active:opacity-60"
                accessibilityRole="button"
              >
                <Card>
                  <View className="flex-row items-center gap-3">
                    <CategoryAvatar
                      icon={cat?.icon}
                      color={cat?.color}
                      fallbackIcon="receipt"
                      size={40}
                    />
                    <View className="flex-1">
                      <Text
                        className="text-text text-base"
                        style={{ fontFamily: fonts.semibold }}
                        numberOfLines={1}
                      >
                        {p.description}
                      </Text>
                      <Text className="text-text-muted text-xs" numberOfLines={1}>
                        {p.installments_paid}/{p.installments_total} cuotas · {wallet?.name ?? '—'}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Money
                        value={p.is_completed ? p.total_amount : p.current_installment_amount}
                        currency={currency}
                        className="text-sm font-semibold"
                      />
                      <Text className="text-text-muted text-[11px]">
                        {p.is_completed ? 'total' : 'cuota actual'}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 gap-1 pl-[52px]">
                    <ProgressBar progress={progress} tone="income" />
                    {p.is_completed ? (
                      <Text
                        className="text-income text-[11px]"
                        style={{ fontFamily: fonts.semibold }}
                      >
                        Pagada por completo
                      </Text>
                    ) : (
                      <Text className="text-text-muted text-[11px]">
                        Falta <Money value={p.remaining_amount} currency={currency} tone="muted" />
                        {p.next_due_date ? ` · próximo corte ${formatShortDate(p.next_due_date)}` : ''}
                      </Text>
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
