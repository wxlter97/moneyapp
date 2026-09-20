import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useLoyaltySummary } from '@/api/queries';
import type { LoyaltyWalletBalance } from '@/api/types';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatMoney, toNumber } from '@/lib/money';
import { formatQuantity, groupByBank, pointsWithoutValue, totalsByCurrency } from '@/lib/rewards';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * Cuerpo de "Recompensas", en `src/screens/` (no en `src/app/`) para que
 * `app/(app)/loyalty.tsx` pueda cargarlo con `lazy()` sin que Expo Router
 * también lo registre como su propia ruta.
 *
 * Una tarjeta por cartera, agrupadas por banco, cada una con lo que tiene
 * disponible para canjear. Tocar una tarjeta abre la suya (`loyalty/[wallet]`):
 * ahí están sus canjes, ajustes y lo que ganó cada compra. Antes esto era una
 * sola lista con todo junto y sin total.
 */
export default function LoyaltyScreen() {
  const summary = useLoyaltySummary();
  const refresh = usePullRefresh(summary.isFetching && !summary.isLoading, () => summary.refetch());

  const wallets = summary.data?.wallets ?? [];
  const groups = groupByBank(wallets);
  const totals = totalsByCurrency(wallets);
  const withoutValue = pointsWithoutValue(wallets);

  return (
    <ProFeatureGate feature="loyalty">
      <ScrollView contentContainerClassName="gap-4 py-2" refreshControl={refresh}>
        {summary.isLoading ? (
          <LoadingState />
        ) : summary.isError ? (
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        ) : wallets.length === 0 ? (
          <EmptyState
            title="Todavía no tienes tarjetas con recompensas"
            hint="Asígnale un producto a una tarjeta (Carteras → esa tarjeta → Recompensas) para empezar a acumular."
          />
        ) : (
          <>
            <Card title="Disponible ahora">
              {totals.map((t) => (
                <Money
                  key={t.currency}
                  value={t.total}
                  currency={t.currency}
                  tone="income"
                  className="text-2xl"
                />
              ))}
              <Text className="text-text-muted mt-1 text-xs">
                Cashback más el valor en dinero de tus puntos, de {wallets.length}{' '}
                {wallets.length === 1 ? 'tarjeta' : 'tarjetas'}.
              </Text>
              {withoutValue > 0 ? (
                <Text className="text-warning mt-1 text-xs">
                  {withoutValue === 1
                    ? 'Un programa de puntos no tiene valor de canje y no entra en este total.'
                    : `${withoutValue} programas de puntos no tienen valor de canje y no entran en este total.`}
                </Text>
              ) : null}
            </Card>

            {groups.map((group) => (
              <View key={group.bank} className="gap-2">
                <Text className="text-text-muted px-1 text-xs uppercase tracking-wide">
                  {group.bankName}
                </Text>
                {group.wallets.map((wallet) => (
                  <WalletRewardsRow key={wallet.wallet} wallet={wallet} />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ProFeatureGate>
  );
}

function WalletRewardsRow({ wallet }: { wallet: LoyaltyWalletBalance }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/loyalty/${wallet.wallet}`)}
      accessibilityRole="button"
      accessibilityLabel={`Recompensas de ${wallet.wallet_name}`}
      className="rounded-2xl border border-border bg-surface/95 p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }}>
            {wallet.wallet_name}
          </Text>
          <Text className="text-text-muted text-xs">{wallet.product_name}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            {formatMoney(toNumber(wallet.total_value), wallet.currency)}
          </Text>
          <Icon name="chevron-right" size={16} color={colors.textMuted} />
        </View>
      </View>

      {wallet.programs.length === 0 ? (
        <Text className="text-text-muted mt-2 text-xs">Esta tarjeta sólo tiene descuentos.</Text>
      ) : (
        <View className="mt-2 gap-1">
          {wallet.programs.map((p) => (
            <View key={p.program} className="flex-row items-center justify-between">
              <Text className="text-text-muted text-xs">{p.name}</Text>
              <Text className="text-text text-xs">
                {formatQuantity(p.unit, p.available, wallet.currency)}
                {p.unit === 'points' && p.estimated_value != null
                  ? `  ≈ ${formatMoney(toNumber(p.estimated_value), wallet.currency)}`
                  : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}
