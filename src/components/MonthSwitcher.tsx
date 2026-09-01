import { Pressable, Text, View } from 'react-native';

import {
  addMonths,
  currentYearMonth,
  formatYearMonth,
  isSameOrAfter,
  type YearMonth,
} from '@/lib/date';

interface MonthSwitcherProps {
  value: YearMonth;
  onChange: (value: YearMonth) => void;
  /** Impide navegar a meses futuros (default false: se permite planificar). */
  clampToCurrent?: boolean;
}

export function MonthSwitcher({ value, onChange, clampToCurrent = false }: MonthSwitcherProps) {
  const next = addMonths(value, 1);
  const atCurrent = clampToCurrent && isSameOrAfter(next, addMonths(currentYearMonth(), 1));

  return (
    <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-2 py-2">
      <Pressable
        onPress={() => onChange(addMonths(value, -1))}
        className="h-8 w-10 items-center justify-center rounded-lg active:bg-surface-2"
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
      >
        <Text className="text-text text-lg">‹</Text>
      </Pressable>

      <Text className="text-text text-base font-semibold capitalize">
        {formatYearMonth(value)}
      </Text>

      <Pressable
        disabled={atCurrent}
        onPress={() => onChange(next)}
        className={`h-8 w-10 items-center justify-center rounded-lg ${
          atCurrent ? 'opacity-30' : 'active:bg-surface-2'
        }`}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
      >
        <Text className="text-text text-lg">›</Text>
      </Pressable>
    </View>
  );
}
