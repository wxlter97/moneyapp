import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  useDeleteLoyaltyMovement,
  useLoyaltyEarnings,
  useLoyaltyMovements,
  useLoyaltySummary,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { LoyaltyMovement, LoyaltyProgramBalance, LoyaltyWalletBalance } from '@/api/types';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatMoney, toNumber } from '@/lib/money';
import { formatQuantity } from '@/lib/rewards';
import { fonts } from '@/theme/typography';

/**
 * Las recompensas de UNA tarjeta: lo que tiene disponible en cada programa (con lo
 * ganado, ajustado y canjeado que explica esa cifra), los botones para canjear o
 * ajustar, el libro de canjes y ajustes, y de dónde salió lo ganado.
 */
export default function LoyaltyWalletScreen() {
  const { wallet: walletId } = useLocalSearchParams<{ wallet: string }>();
  const summary = useLoyaltySummary();
  const movements = useLoyaltyMovements(walletId);
  const earnings = useLoyaltyEarnings(walletId);
  const refresh = usePullRefresh(summary.isFetching && !summary.isLoading, () => {
    summary.refetch();
    movements.refetch();
    earnings.refetch();
  });

  const wallet = summary.data?.wallets.find((w) => w.wallet === walletId);

  return (
    <ProFeatureGate feature="loyalty">
      <ScrollView contentContainerClassName="gap-4 py-2" refreshControl={refresh}>
        {summary.isLoading ? (
          <LoadingState />
        ) : summary.isError ? (
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        ) : !wallet ? (
          <EmptyState title="Esta tarjeta no tiene recompensas" hint="Asígnale un producto para acumular." />
        ) : (
          <>
            <Card>
              <Text className="text-text-muted text-xs uppercase tracking-wide">
                {wallet.bank_name} · {wallet.product_name}
              </Text>
              <Text className="text-text mt-0.5 text-lg" style={{ fontFamily: fonts.bold }}>
                {wallet.wallet_name}
              </Text>
              <Text className="text-text-muted mt-2 text-xs">Disponible ahora</Text>
              <Money value={wallet.total_value} currency={wallet.currency} tone="income" className="text-2xl" />
              {toNumber(wallet.discount_saved) > 0 ? (
                <Text className="text-text-muted mt-1 text-xs">
                  Ahorrado en descuentos: {formatMoney(toNumber(wallet.discount_saved), wallet.currency)}
                </Text>
              ) : null}
            </Card>

            {wallet.programs.map((program) => (
              <ProgramCard key={program.program} wallet={wallet} program={program} />
            ))}

            <MovementsCard wallet={wallet} movements={movements} />
            <EarningsCard wallet={wallet} earnings={earnings} />
          </>
        )}
      </ScrollView>
    </ProFeatureGate>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-text-muted text-[11px]">{label}</Text>
      <Text className="text-text text-xs">{value}</Text>
    </View>
  );
}

function ProgramCard({ wallet, program }: { wallet: LoyaltyWalletBalance; program: LoyaltyProgramBalance }) {
  const q = (v: string) => formatQuantity(program.unit, v, wallet.currency);
  const available = toNumber(program.available);
  return (
    <Card title={program.name}>
      <Text className="text-text text-2xl" style={{ fontFamily: fonts.bold }}>
        {q(program.available)}
      </Text>
      {program.unit === 'points' ? (
        <Text className="text-text-muted text-xs">
          {program.estimated_value != null
            ? `≈ ${formatMoney(toNumber(program.estimated_value), wallet.currency)} (${program.point_value} por punto)`
            : 'Sin valor de canje: no entra en el total en dinero.'}
        </Text>
      ) : null}
      {available < 0 ? (
        <Text className="text-expense mt-1 text-xs">
          El disponible quedó en negativo (se borró o cambió un gasto que ya se había canjeado). Ajústalo
          para corregirlo.
        </Text>
      ) : null}

      <View className="mt-3 flex-row gap-3">
        <Fact label="Ganado" value={q(program.earned)} />
        <Fact label="Ajustado" value={q(program.adjusted)} />
        <Fact label="Canjeado" value={q(program.redeemed)} />
      </View>
      {program.min_amount ? (
        <Text className="text-text-muted mt-2 text-xs">
          Sólo gana en compras desde {formatMoney(toNumber(program.min_amount), wallet.currency)}.
        </Text>
      ) : null}

      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <Button
            label="Canjear"
            disabled={available <= 0}
            onPress={() =>
              router.push({
                pathname: '/loyalty/redeem',
                params: { wallet: wallet.wallet, program: program.program },
              })
            }
          />
        </View>
        <View className="flex-1">
          <Button
            label="Ajustar"
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: '/loyalty/adjust',
                params: { wallet: wallet.wallet, program: program.program },
              })
            }
          />
        </View>
      </View>
    </Card>
  );
}

function MovementsCard({
  wallet,
  movements,
}: {
  wallet: LoyaltyWalletBalance;
  movements: ReturnType<typeof useLoyaltyMovements>;
}) {
  const remove = useDeleteLoyaltyMovement();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = movements.data ?? [];

  async function undo(id: string) {
    setError(null);
    try {
      await remove.mutateAsync(id);
      setConfirming(null);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo deshacer.'));
    }
  }

  return (
    <Card title="Canjes y ajustes">
      {movements.isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <Text className="text-text-muted text-sm">
          Todavía no has canjeado ni ajustado nada en esta tarjeta.
        </Text>
      ) : (
        rows.map((m, i) => (
          <MovementRow
            key={m.id}
            movement={m}
            wallet={wallet}
            first={i === 0}
            confirming={confirming === m.id}
            busy={remove.isPending}
            onAskUndo={() => setConfirming(m.id)}
            onCancel={() => setConfirming(null)}
            onUndo={() => undo(m.id)}
          />
        ))
      )}
      {error ? <Text className="text-expense mt-2 text-xs">{error}</Text> : null}
    </Card>
  );
}

function MovementRow({
  movement: m,
  wallet,
  first,
  confirming,
  busy,
  onAskUndo,
  onCancel,
  onUndo,
}: {
  movement: LoyaltyMovement;
  wallet: LoyaltyWalletBalance;
  first: boolean;
  confirming: boolean;
  busy: boolean;
  onAskUndo: () => void;
  onCancel: () => void;
  onUndo: () => void;
}) {
  const program = wallet.programs.find((p) => p.program === m.program);
  const unit = program?.unit ?? 'points';
  const delta = toNumber(m.delta);
  const redeem = m.kind === 'redeem';
  return (
    <View className={`gap-1 py-2.5 ${first ? '' : 'border-t border-border/30'}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            {redeem ? 'Canje' : 'Ajuste'} · {m.program_name}
          </Text>
          <Text className="text-text-muted text-xs">
            {m.date}
            {m.note ? ` · ${m.note}` : ''}
          </Text>
          {redeem && m.cash_value ? (
            <Text className="text-text-muted text-xs">
              Valió {formatMoney(toNumber(m.cash_value), wallet.currency)}
              {m.deposit_transaction ? ' · depositado en una cartera' : ' · sin depositar'}
            </Text>
          ) : null}
        </View>
        <Text
          className={`text-sm ${delta < 0 ? 'text-expense' : 'text-income'}`}
          style={{ fontFamily: fonts.semibold }}
        >
          {delta > 0 ? '+' : ''}
          {formatQuantity(unit, m.delta, wallet.currency)}
        </Text>
      </View>

      {confirming ? (
        <View className="gap-2">
          <Text className="text-text-muted text-xs">
            {m.deposit_transaction
              ? 'Se devuelve al disponible y también se elimina el ingreso que se registró. ¿Deshacer?'
              : 'Se devuelve al disponible. ¿Deshacer?'}
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label="Sí, deshacer" loading={busy} onPress={onUndo} />
            </View>
            <View className="flex-1">
              <Button label="Cancelar" variant="ghost" disabled={busy} onPress={onCancel} />
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-row gap-4">
          <Text
            className="text-primary text-xs"
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/loyalty/adjust',
                params: { wallet: m.wallet, program: m.program, movement: m.id },
              })
            }
          >
            Editar
          </Text>
          <Text className="text-expense text-xs" accessibilityRole="button" onPress={onAskUndo}>
            Deshacer
          </Text>
        </View>
      )}
    </View>
  );
}

function EarningsCard({
  wallet,
  earnings,
}: {
  wallet: LoyaltyWalletBalance;
  earnings: ReturnType<typeof useLoyaltyEarnings>;
}) {
  const rows = (earnings.data ?? []).slice(0, 25);
  return (
    <Card title="Lo que ganaste por compra">
      {earnings.isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <Text className="text-text-muted text-sm">
          Todavía no hay recompensas registradas. Se registran al guardar cada gasto con esta tarjeta.
        </Text>
      ) : (
        rows.map((e, i) => {
          const program = wallet.programs.find((p) => p.program === e.program);
          const value =
            e.kind === 'points'
              ? formatQuantity('points', e.points, wallet.currency)
              : e.kind === 'cashback'
                ? formatMoney(toNumber(e.amount), wallet.currency)
                : `Ahorro ${formatMoney(toNumber(e.saved_amount), wallet.currency)}`;
          return (
            <View
              key={e.id}
              className={`flex-row items-center justify-between py-2 ${i > 0 ? 'border-t border-border/30' : ''}`}
            >
              <View className="flex-1 pr-2">
                <Text className="text-text text-sm" numberOfLines={1}>
                  {e.transaction_description || 'Compra sin descripción'}
                </Text>
                <Text className="text-text-muted text-xs">
                  {e.transaction_date} · {program?.name ?? e.program_name}
                </Text>
              </View>
              <Text className="text-income text-sm" style={{ fontFamily: fonts.semibold }}>
                {e.kind === 'discount' ? '' : '+'}
                {value}
              </Text>
            </View>
          );
        })
      )}
      {(earnings.data?.length ?? 0) > rows.length ? (
        <Text className="text-text-muted mt-2 text-xs">Se muestran las últimas {rows.length}.</Text>
      ) : null}
    </Card>
  );
}
