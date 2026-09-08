import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useLoyaltySummary } from '@/api/queries';
import { useWalletMap } from '@/api/queries/lookups';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { currentYearMonth, formatYearMonth, monthRange } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { fonts } from '@/theme/typography';

/**
 * Saldo de puntos (acumulado, todas las cartas) + cashback ganado/descuento
 * ahorrado en el mes elegido -- ver `apps.loyalty` en el backend. Se llega
 * acá desde una tarjeta con producto asignado (ver `WalletForm`).
 */
export default function LoyaltyScreen() {
  const [month, setMonth] = useState(currentYearMonth());
  const range = monthRange(month);
  const summary = useLoyaltySummary({ date_after: range.from, date_before: range.to });
  const { map: wallets } = useWalletMap();
  const refresh = usePullRefresh(summary.isFetching && !summary.isLoading, () => summary.refetch());

  const points = summary.data?.points_balances ?? [];
  const totals = summary.data?.period_totals ?? [];

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Recompensas" />
      <ScrollView contentContainerClassName="gap-4 py-2" refreshControl={refresh}>
        {summary.isLoading ? (
          <LoadingState />
        ) : summary.isError ? (
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        ) : (
          <>
            <Card title="Puntos acumulados">
              {points.length === 0 ? (
                <Text className="text-text-muted text-sm">
                  Sin puntos todavía -- asignale un producto a tu tarjeta (Herramientas → esa
                  cartera) para empezar a acumular.
                </Text>
              ) : (
                points.map((p, i) => {
                  const wallet = wallets.get(p.wallet);
                  return (
                    <View
                      key={`${p.wallet}-${p.program}`}
                      className={`flex-row items-center justify-between py-2.5 ${
                        i > 0 ? 'border-t border-border/30' : ''
                      }`}
                    >
                      <View className="flex-1 pr-2">
                        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                          {p.program_name}
                        </Text>
                        <Text className="text-text-muted text-xs">{wallet?.name ?? p.wallet_name}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                          {toNumber(p.points)} pts
                        </Text>
                        {p.estimated_value != null ? (
                          <Money
                            value={p.estimated_value}
                            currency={wallet?.currency ?? 'USD'}
                            tone="muted"
                            className="text-[11px]"
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </Card>

            <View className="gap-2">
              <Text className="text-text-muted px-1 text-xs uppercase tracking-wide">
                {formatYearMonth(month)}
              </Text>
              <MonthSwitcher value={month} onChange={setMonth} />
            </View>

            <Card title="Cashback y descuentos del mes">
              {totals.length === 0 ? (
                <Text className="text-text-muted text-sm">
                  Sin cashback ni descuentos este mes.
                </Text>
              ) : (
                totals.map((t, i) => {
                  const wallet = wallets.get(t.wallet);
                  const currency = wallet?.currency ?? 'USD';
                  return (
                    <View
                      key={t.wallet}
                      className={`gap-1 py-2.5 ${i > 0 ? 'border-t border-border/30' : ''}`}
                    >
                      <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                        {wallet?.name ?? t.wallet_name}
                      </Text>
                      <View className="flex-row justify-between">
                        <Text className="text-text-muted text-xs">Cashback ganado</Text>
                        <Money value={t.cashback_earned} currency={currency} tone="income" className="text-xs" />
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-text-muted text-xs">Ahorrado en descuentos</Text>
                        <Money value={t.discount_saved} currency={currency} tone="income" className="text-xs" />
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
