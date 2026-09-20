import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useHasFeature, useLoyaltySummary } from '@/api/queries';
import type { Wallet } from '@/api/types';
import { Icon } from '@/components/ui/Icon';
import { formatMoney, toNumber } from '@/lib/money';
import { formatQuantity } from '@/lib/rewards';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * Lo que una tarjeta con recompensas tiene disponible hoy: cada programa con su saldo y el
 * total en dinero. Va arriba del historial de la cartera; tocarlo abre las recompensas de
 * esta tarjeta (canjear, ajustar, movimientos). No se muestra sin producto de tarjeta ni
 * sin el plan que incluye recompensas.
 */
export function WalletRewardsCard({ wallet }: { wallet: Wallet }) {
  const colors = useColors();
  const hasLoyalty = useHasFeature('loyalty');
  const enabled = !!wallet.card_product && hasLoyalty === true;
  const summary = useLoyaltySummary(undefined, enabled);

  if (!enabled || summary.isLoading || summary.isError) return null;

  const balance = summary.data?.wallets.find((w) => w.wallet === wallet.id);
  if (!balance) return null;
  const currency = wallet.currency;
  const hasAnything =
    balance.programs.some((p) => toNumber(p.earned) || toNumber(p.adjusted) || toNumber(p.redeemed)) ||
    toNumber(balance.discount_saved) > 0;

  return (
    <Pressable
      onPress={() => router.push(`/loyalty/${wallet.id}`)}
      accessibilityRole="button"
      accessibilityLabel="Ver recompensas"
      className="gap-1.5 rounded-3xl border border-border/60 bg-surface/95 px-4 py-3 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-text-muted text-xs uppercase tracking-wide">Recompensas disponibles</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            {formatMoney(toNumber(balance.total_value), currency)}
          </Text>
          <Icon name="chevron-right" size={14} color={colors.textMuted} />
        </View>
      </View>
      {!hasAnything ? (
        <Text className="text-text-muted text-sm">
          Todavía no hay recompensas registradas en esta tarjeta. Se registran al guardar cada gasto.
        </Text>
      ) : (
        balance.programs.map((p) => (
          <View key={p.program} className="flex-row items-center justify-between">
            <Text className="text-text text-sm">{p.name}</Text>
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              {formatQuantity(p.unit, p.available, currency)}
            </Text>
          </View>
        ))
      )}
    </Pressable>
  );
}
