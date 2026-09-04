import { Text, View } from 'react-native';

import type { Wallet } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { toNumber } from '@/lib/money';
import { walletColor } from '@/lib/wallets';

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

  return (
    <View className="py-3" style={{ paddingLeft: depth * 16 }}>
      <View className="flex-row items-center justify-between">
        <View
          className="mr-3 h-8 w-1.5 rounded-full"
          style={{ backgroundColor: walletColor(wallet) }}
        />
        <View className="flex-1 pr-3">
          <Text className="text-text text-base" numberOfLines={1}>
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
        <View className="mt-2 gap-1">
          <ProgressBar progress={toNumber(wallet.current_balance) / goal} tone="income" />
          <Text className="text-text-muted text-[11px]">
            <Money value={wallet.current_balance} currency={wallet.currency} tone="muted" /> /{' '}
            <Money value={goal} currency={wallet.currency} tone="muted" /> de meta
          </Text>
        </View>
      ) : null}
    </View>
  );
}
