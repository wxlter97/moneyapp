import { Pressable, Text, View } from 'react-native';

import type { Category, Transaction, Wallet } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { walletLabel } from '@/api/queries/lookups';

interface TransactionRowProps {
  txn: Transaction;
  category?: Category;
  wallet?: Wallet;
  toWallet?: Wallet;
  onPress?: () => void;
}

const SOURCE_LABEL: Record<Transaction['source'], string | null> = {
  manual: null,
  email_import: 'correo',
  recurring: 'recurrente',
  installment: 'cuota',
};

export function TransactionRow({ txn, category, wallet, toWallet, onPress }: TransactionRowProps) {
  const isTransfer = txn.type === 'transfer';
  const isIncome = txn.type === 'income';
  const badge = SOURCE_LABEL[txn.source];

  const title = isTransfer
    ? 'Transferencia'
    : txn.description || category?.name || 'Sin descripción';

  const subtitle = isTransfer
    ? `${walletLabel(wallet)} → ${walletLabel(toWallet)}`
    : `${category?.name ?? '—'} · ${walletLabel(wallet)}`;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-60"
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View className="flex-1">
        <Text className="text-text text-base" numberOfLines={1}>
          {title}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          <Text className="text-text-muted text-xs" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View className="items-end gap-1">
        <Money
          value={txn.amount}
          currency={txn.currency}
          tone={isTransfer ? 'muted' : isIncome ? 'income' : 'expense'}
          className="text-base font-semibold"
        />
        <View className="flex-row items-center gap-1">
          {txn.type === 'expense' && !txn.counts_toward_budget ? (
            <View className="rounded-full bg-surface-2 px-2 py-0.5">
              <Text className="text-warning text-[10px] uppercase tracking-wide">s/pres.</Text>
            </View>
          ) : null}
          {badge ? (
            <View className="rounded-full bg-surface-2 px-2 py-0.5">
              <Text className="text-text-muted text-[10px] uppercase tracking-wide">{badge}</Text>
            </View>
          ) : !isTransfer ? (
            <Text className="text-text-muted text-[10px] uppercase tracking-wide">manual</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
