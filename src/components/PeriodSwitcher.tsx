import { Pressable, Text, View } from 'react-native';

import type { BudgetPeriod, ISODate } from '@/api/types';
import { nextPeriodStart, periodLabel, periodStart, previousPeriodStart } from '@/lib/periods';
import { todayISO } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { Icon } from './ui/Icon';

interface PeriodSwitcherProps {
  /** `period_start` del período mostrado. */
  value: ISODate;
  /** Cadencia del workspace activo (ver `Workspace.budget_period`). */
  period: BudgetPeriod;
  onChange: (value: ISODate) => void;
  /** Impide navegar a un período futuro (default false: se permite planificar). */
  clampToCurrent?: boolean;
}

/**
 * Selector de período de presupuesto: chevrons para +/-1 período. A
 * diferencia de `MonthSwitcher` no tiene grilla de salto rápido -- "12
 * meses" no tiene un equivalente igual de simple para diario/semanal, y el
 * uso real es sobre todo navegar de a uno hacia atrás/adelante.
 */
export function PeriodSwitcher({ value, period, onChange, clampToCurrent = false }: PeriodSwitcherProps) {
  const colors = useColors();
  const next = nextPeriodStart(value, period);
  const atCurrent = clampToCurrent && next > periodStart(todayISO(), period);

  return (
    <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-2 py-2">
      <Pressable
        onPress={() => {
          haptics.tap();
          onChange(previousPeriodStart(value, period));
        }}
        className="h-8 w-10 items-center justify-center rounded-lg active:bg-surface-2"
        accessibilityRole="button"
        accessibilityLabel="Período anterior"
      >
        <Icon name="chevron-left" size={18} color={colors.text} />
      </Pressable>

      <Text className="text-text text-base font-semibold capitalize">{periodLabel(value, period)}</Text>

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
        accessibilityLabel="Período siguiente"
      >
        <Icon name="chevron-right" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}
