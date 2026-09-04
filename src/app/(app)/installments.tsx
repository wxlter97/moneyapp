import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useInstallments, usePayInstallment } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import type { InstallmentPurchase } from '@/api/types';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

export default function InstallmentsScreen() {
  const colors = useColors();
  const q = useInstallments();
  const pay = usePayInstallment();
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      [...(q.data ?? [])].sort(
        (a, b) => Number(a.is_completed) - Number(b.is_completed) || a.description.localeCompare(b.description),
      ),
    [q.data],
  );

  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());

  async function onPay(p: InstallmentPurchase) {
    haptics.impact();
    setBusyId(p.id);
    try {
      await pay.mutateAsync(p.id);
      haptics.success();
    } finally {
      setBusyId(null);
    }
  }

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
              <Card key={p.id}>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    router.push(`/installment/${p.id}`);
                  }}
                  className="active:opacity-60"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                      {cat?.icon ? (
                        <Text className="text-base">{cat.icon}</Text>
                      ) : (
                        <Icon name="receipt" size={16} color={colors.textMuted} />
                      )}
                      {cat?.color ? (
                        <View
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface"
                          style={{ backgroundColor: cat.color }}
                        />
                      ) : null}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-text text-base"
                        style={{ fontFamily: fonts.semibold }}
                        numberOfLines={1}
                      >
                        {p.description}
                      </Text>
                      <Text className="text-text-muted text-xs" numberOfLines={1}>
                        {p.installments_paid}/{p.installments_total} cuotas ·{' '}
                        {wallet?.name ?? '—'}
                        {p.is_credit_card
                          ? ` · paga desde ${wallets.get(p.payment_wallet ?? '')?.name ?? '—'}`
                          : ''}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Money
                        value={p.installment_amount}
                        currency={currency}
                        className="text-sm font-semibold"
                      />
                      <Text className="text-text-muted text-[11px]">por cuota</Text>
                    </View>
                  </View>
                </Pressable>

                <View className="mt-3 gap-1">
                  <ProgressBar progress={progress} tone="income" />
                  <Text className="text-text-muted text-[11px]">
                    Falta <Money value={p.remaining_amount} currency={currency} tone="muted" />
                  </Text>
                </View>

                {!p.is_completed ? (
                  <Pressable
                    onPress={() => onPay(p)}
                    disabled={busyId === p.id}
                    className="mt-3 items-center rounded-full bg-surface-2 py-2 active:opacity-60"
                    accessibilityRole="button"
                  >
                    <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                      {busyId === p.id ? '…' : 'Registrar cuota'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    className="text-income mt-3 text-center text-xs"
                    style={{ fontFamily: fonts.semibold }}
                  >
                    Pagada por completo
                  </Text>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
