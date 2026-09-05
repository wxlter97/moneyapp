import { Text, View } from 'react-native';

import type { Wallet } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { toNumber } from '@/lib/money';
import { walletColor } from '@/lib/wallets';
import { fonts } from '@/theme/typography';

interface WalletRowProps {
  wallet: Wallet;
  /** true si tiene hijos → muestra el saldo agregado. */
  hasChildren?: boolean;
  /** Nivel de anidación (0 = raíz). */
  depth?: number;
}

export function WalletRow({ wallet, hasChildren = false, depth = 0 }: WalletRowProps) {
  const balance = toNumber(hasChildren ? wallet.aggregated_balance : wallet.current_balance);
  const goal = toNumber(wallet.goal_amount);
  // En una deuda, `current_balance` es lo que queda pendiente (con signo
  // según "debo"/"me deben"), no lo ya aportado -- mostrarlo tal cual contra
  // la meta (el monto total de la deuda) daba una barra en 0 o negativa. Lo
  // aportado es `total - |pendiente|`, y crece de 0 hacia la meta igual que
  // un ahorro.
  const isDebtGoal = wallet.purpose === 'debt' && goal > 0;
  const contributed = isDebtGoal
    ? Math.max(0, goal - Math.abs(toNumber(wallet.current_balance)))
    : toNumber(wallet.current_balance);
  const hasCredit =
    wallet.kind === 'credit' &&
    wallet.credit_limit != null &&
    wallet.available_credit != null;

  return (
    <View className="py-3" style={{ paddingLeft: depth * 16 }}>
      <View className="flex-row items-center justify-between">
        <View
          className="mr-3 h-8 w-1.5 rounded-full"
          style={{ backgroundColor: walletColor(wallet) }}
        />
        <View className="flex-1 pr-3">
          <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
            {wallet.name}
            {wallet.card_last4 ? (
              <Text className="text-text-muted"> ···· {wallet.card_last4}</Text>
            ) : null}
          </Text>
          <Text className="text-text-muted text-xs">
            {!wallet.counts_toward_net_worth ? 'fuera del neto' : null}
            {!wallet.counts_toward_net_worth && wallet.visibility === 'private' ? ' · ' : null}
            {wallet.visibility === 'private' ? 'privada' : null}
            {!wallet.is_active ? ' · inactiva' : null}
          </Text>
        </View>
        <Money
          value={balance}
          currency={wallet.currency}
          tone={balance < 0 ? 'expense' : 'default'}
          className="text-base font-semibold"
        />
      </View>

      {goal > 0 ? (
        <View className="mt-2 gap-1 pl-[18px]">
          <ProgressBar progress={contributed / goal} tone="income" />
          <Text className="text-text-muted text-[11px]">
            <Money value={contributed} currency={wallet.currency} tone="muted" /> /{' '}
            <Money value={goal} currency={wallet.currency} tone="muted" /> de{' '}
            {isDebtGoal ? 'la deuda' : 'meta'}
          </Text>
        </View>
      ) : null}

      {hasCredit ? (
        <View className="mt-2 gap-1 pl-[18px]">
          <ProgressBar
            progress={
              1 - toNumber(wallet.available_credit) / toNumber(wallet.credit_limit)
            }
            over={
              toNumber(wallet.available_credit) / toNumber(wallet.credit_limit) < 0.1
            }
          />
          <Text className="text-text-muted text-[11px]">
            <Money value={wallet.available_credit} currency={wallet.currency} tone="muted" />{' '}
            disponibles de{' '}
            <Money value={wallet.credit_limit} currency={wallet.currency} tone="muted" />
          </Text>
        </View>
      ) : null}
    </View>
  );
}
