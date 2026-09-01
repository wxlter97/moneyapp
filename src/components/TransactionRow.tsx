import { Pressable, Text, View } from 'react-native';

import type { Account, Category, Transaction } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { accountLabel } from '@/api/queries/lookups';
import { formatShortDate } from '@/lib/date';

interface TransactionRowProps {
  txn: Transaction;
  category?: Category;
  account?: Account;
  onPress?: () => void;
}

const SOURCE_LABEL: Record<Transaction['source'], string | null> = {
  manual: null,
  email_import: 'correo',
  recurring: 'recurrente',
  installment: 'cuota',
};

export function TransactionRow({ txn, category, account, onPress }: TransactionRowProps) {
  const isIncome = category?.type === 'income';
  const badge = SOURCE_LABEL[txn.source];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-60"
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View className="flex-1">
        <Text className="text-text text-base" numberOfLines={1}>
          {txn.description || category?.name || 'Sin descripción'}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          <Text className="text-text-muted text-xs" numberOfLines={1}>
            {formatShortDate(txn.date)} · {category?.name ?? '—'} · {accountLabel(account)}
          </Text>
        </View>
      </View>

      <View className="items-end gap-1">
        <Money
          value={txn.amount}
          currency={txn.currency}
          tone={isIncome ? 'income' : 'expense'}
          className="text-base font-semibold"
        />
        {badge ? (
          <View className="rounded-full bg-surface-2 px-2 py-0.5">
            <Text className="text-text-muted text-[10px] uppercase tracking-wide">{badge}</Text>
          </View>
        ) : (
          <Text className="text-text-muted text-[10px] uppercase tracking-wide">manual</Text>
        )}
      </View>
    </Pressable>
  );
}
