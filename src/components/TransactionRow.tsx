import { Pressable, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import type { Category, Transaction, Wallet } from '@/api/types';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { walletLabel } from '@/api/queries/lookups';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface TransactionRowProps {
  txn: Transaction;
  category?: Category;
  wallet?: Wallet;
  toWallet?: Wallet;
  onPress?: () => void;
  /** Si se pasa, la fila se puede arrastrar hacia la izquierda para borrar. */
  onSwipeDelete?: () => void;
}

const SOURCE_LABEL: Record<Transaction['source'], string | null> = {
  manual: null,
  email_import: 'correo',
  recurring: 'recurrente',
  installment: 'cuota',
  quick_add: 'atajo',
};

/**
 * Fila de movimiento: avatar neutro (el color de la categoría queda como un
 * punto discreto, no llenando el círculo) + título/subtítulo + importe.
 * Deslizable a la izquierda para borrar cuando se pasa `onSwipeDelete`.
 */
export function TransactionRow({
  txn,
  category,
  wallet,
  toWallet,
  onPress,
  onSwipeDelete,
}: TransactionRowProps) {
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

  const row = (
    // `className` no se resuelve en `Animated.View` de reanimated: el fondo
    // (necesario para tapar la acción roja mientras no se desliza) va inline.
    // Debe ser el mismo tono que la card contenedora (`colors.surface`), no el
    // del fondo de pantalla (`colors.bg`) — si no, cada fila se ve como un
    // recuadro de otro tono flotando dentro de la card.
    <Animated.View style={[pressStyle, { backgroundColor: colors.surface }]}>
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
        <CategoryAvatar
          icon={glyph}
          color={dotColor}
          fallbackIcon={isTransfer ? 'swap' : isIncome ? 'arrow-up-right' : 'tag'}
          size={40}
        />

        <View className="flex-1">
          <View className="flex-row items-center gap-1">
            <Text
              className="text-text shrink text-base"
              style={{ fontFamily: fonts.semibold }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {txn.has_receipt ? (
              <Icon name="camera" size={11} color={colors.textMuted} />
            ) : null}
          </View>
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

  if (!onSwipeDelete) return row;

  return (
    <Swipeable
      friction={2}
      rightThreshold={44}
      overshootFriction={8}
      renderRightActions={(progress) => (
        <SwipeDeleteAction progress={progress} onPress={onSwipeDelete} />
      )}
    >
      {row}
    </Swipeable>
  );
}

function SwipeDeleteAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View className="w-20 items-center justify-center">
      <Pressable
        onPress={() => {
          haptics.warning();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Eliminar movimiento"
        className="h-full w-full items-center justify-center"
      >
        {/* `className` no se resuelve en `Animated.View` de reanimated: el look
            va en una View normal adentro, el `Animated.View` sólo anima scale/opacity. */}
        <Animated.View style={style}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-expense">
            <Icon name="trash" size={18} color="#FFFFFF" />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
