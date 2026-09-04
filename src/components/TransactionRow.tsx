import { Pressable, Text, View } from 'react-native';

import type { Category, Transaction, Wallet } from '@/api/types';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { walletLabel } from '@/api/queries/lookups';
import { toNumber } from '@/lib/money';

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

/** Fila de movimiento estilo Buddy: icono circular + título/subtítulo + importe. */
export function TransactionRow({ txn, category, wallet, toWallet, onPress }: TransactionRowProps) {
  const isTransfer = txn.type === 'transfer';
  const isIncome = txn.type === 'income';
  const badge = SOURCE_LABEL[txn.source];

  const amount = toNumber(txn.amount);
  // Firma desde la perspectiva del saldo: ingreso suma, gasto y transferencia restan.
  const signed = isIncome ? amount : -amount;

  const title = isTransfer
    ? 'Transferencia'
    : txn.description || category?.name || 'Sin descripción';

  const subtitle = isTransfer
    ? `${walletLabel(wallet)} → ${walletLabel(toWallet)}`
    : `${category?.name ?? '—'} · ${walletLabel(wallet)}`;

  const glyph = category?.icon;
  const circleColor = isTransfer ? '#334155' : category?.color || '#334155';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-60"
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: circleColor }}
      >
        {glyph ? (
          <Text className="text-sm">{glyph}</Text>
        ) : (
          <Icon
            name={isTransfer ? 'swap' : isIncome ? 'arrow-up-right' : 'tag'}
            size={16}
            color="#FFFFFF"
          />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-text text-base" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View className="items-end gap-1">
        <Money
          value={signed}
          currency={txn.currency}
          parens
          tone={isTransfer ? 'muted' : isIncome ? 'income' : 'expense'}
          className="text-base font-semibold"
        />
        {txn.type === 'expense' && !txn.counts_toward_budget ? (
          <View className="rounded-full bg-surface-2 px-2 py-0.5">
            <Text className="text-warning text-[10px] uppercase tracking-wide">s/pres.</Text>
          </View>
        ) : badge ? (
          <View className="rounded-full bg-surface-2 px-2 py-0.5">
            <Text className="text-text-muted text-[10px] uppercase tracking-wide">{badge}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
