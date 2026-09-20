import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useHasFeature, useLoyaltySummary } from '@/api/queries';
import type { Wallet } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { currentYearMonth, monthRange } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { fonts } from '@/theme/typography';

/**
 * Lo que una tarjeta con recompensas ya ganó: puntos acumulados, cashback y lo
 * ahorrado en descuentos (total y del mes). Va arriba del historial de la cartera:
 * antes esto sólo se veía en Herramientas → Recompensas, sumando todas las
 * tarjetas, y la pantalla de la propia tarjeta no decía nada.
 *
 * No se muestra sin producto de tarjeta ni sin el plan que incluye recompensas.
 */
export function WalletRewardsCard({ wallet }: { wallet: Wallet }) {
  const hasLoyalty = useHasFeature('loyalty');
  const enabled = !!wallet.card_product && hasLoyalty === true;
  const month = monthRange(currentYearMonth());
  const total = useLoyaltySummary(undefined, enabled);
  const thisMonth = useLoyaltySummary({ date_after: month.from, date_before: month.to }, enabled);

  if (!enabled || total.isLoading || total.isError) return null;

  const points = (total.data?.points_balances ?? []).filter((p) => p.wallet === wallet.id);
  const all = total.data?.period_totals.find((t) => t.wallet === wallet.id);
  const monthly = thisMonth.data?.period_totals.find((t) => t.wallet === wallet.id);
  const cashback = toNumber(all?.cashback_earned ?? '0');
  const saved = toNumber(all?.discount_saved ?? '0');
  const empty = points.length === 0 && cashback === 0 && saved === 0;
  const currency = wallet.currency;

  return (
    <Pressable
      onPress={() => router.push('/loyalty')}
      accessibilityRole="button"
      accessibilityLabel="Ver recompensas"
      className="gap-1.5 rounded-3xl border border-border/60 bg-surface/95 px-4 py-3 active:opacity-80"
    >
      <Text className="text-text-muted text-xs uppercase tracking-wide">Recompensas ganadas</Text>
      {empty ? (
        <Text className="text-text-muted text-sm">
          Todavía no hay recompensas registradas en esta tarjeta. Se registran al guardar cada
          gasto.
        </Text>
      ) : (
        <>
          {points.map((p) => (
            <Row
              key={p.program}
              label={p.program_name}
              value={
                <View className="items-end">
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    {toNumber(p.points)} pts
                  </Text>
                  {p.estimated_value != null ? (
                    <Money value={p.estimated_value} currency={currency} tone="muted" className="text-[11px]" />
                  ) : null}
                </View>
              }
            />
          ))}
          {cashback > 0 || monthly?.cashback_earned ? (
            <Row
              label="Cashback ganado"
              value={<Money value={String(cashback)} currency={currency} tone="income" className="text-sm" />}
              hint={
                toNumber(monthly?.cashback_earned ?? '0') > 0 ? (
                  <Money value={monthly!.cashback_earned} currency={currency} tone="muted" className="text-[11px]" />
                ) : null
              }
              hintLabel="este mes"
            />
          ) : null}
          {saved > 0 ? (
            <Row
              label="Ahorrado en descuentos"
              value={<Money value={String(saved)} currency={currency} tone="income" className="text-sm" />}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

function Row({
  label,
  value,
  hint,
  hintLabel,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintLabel?: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 pr-2">
        <Text className="text-text text-sm">{label}</Text>
        {hint ? (
          <View className="flex-row items-center gap-1">
            {hint}
            <Text className="text-text-muted text-[11px]">{hintLabel}</Text>
          </View>
        ) : null}
      </View>
      {value}
    </View>
  );
}
