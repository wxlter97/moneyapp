import { Pressable, Text, View } from 'react-native';

import {
  addMonths,
  currentYearMonth,
  formatYearMonth,
  isSameOrAfter,
  type YearMonth,
} from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { Icon } from './ui/Icon';

interface MonthSwitcherProps {
  value: YearMonth;
  onChange: (value: YearMonth) => void;
  /** Impide navegar a meses futuros (default false: se permite planificar). */
  clampToCurrent?: boolean;
}

export function MonthSwitcher({ value, onChange, clampToCurrent = false }: MonthSwitcherProps) {
  const colors = useColors();
  const next = addMonths(value, 1);
  const atCurrent = clampToCurrent && isSameOrAfter(next, addMonths(currentYearMonth(), 1));

  return (
    <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-2 py-2">
      <Pressable
        onPress={() => {
          haptics.tap();
          onChange(addMonths(value, -1));
        }}
        className="h-8 w-10 items-center justify-center rounded-lg active:bg-surface-2"
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
      >
        <Icon name="chevron-left" size={18} color={colors.text} />
      </Pressable>

      <Text className="text-text text-base font-semibold capitalize">
        {formatYearMonth(value)}
      </Text>

      <Pressable
        disabled={atCurrent}
        onPress={() => {
          haptics.tap();
          onChange(next);
        }}
        className={`h-8 w-10 items-center justify-center rounded-lg ${
          atCurrent ? 'opacity-30' : 'active:bg-surface-2'
        }`}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
      >
        <Icon name="chevron-right" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}
