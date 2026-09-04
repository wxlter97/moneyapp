import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { Category, Transaction, Wallet } from '@/api/types';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { walletLabel } from '@/api/queries/lookups';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

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

/**
 * Fila de movimiento: avatar neutro (el color de la categoría queda como un
 * punto discreto, no llenando el círculo) + título/subtítulo + importe.
 */
export function TransactionRow({ txn, category, wallet, toWallet, onPress }: TransactionRowProps) {
  const colors = useColors();
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

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
  const dotColor = isTransfer ? undefined : category?.color;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        onPressIn={() => {
          if (!onPress) return;
          press.value = withSpring(0.98, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        className="flex-row items-center gap-3 py-3"
        accessibilityRole={onPress ? 'button' : undefined}
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
          {glyph ? (
            <Text className="text-base">{glyph}</Text>
          ) : (
            <Icon
              name={isTransfer ? 'swap' : isIncome ? 'arrow-up-right' : 'tag'}
              size={16}
              color={colors.textMuted}
            />
          )}
          {dotColor ? (
            <View
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface"
              style={{ backgroundColor: dotColor }}
            />
          ) : null}
        </View>

        <View className="flex-1">
          <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
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
    </Animated.View>
  );
}
