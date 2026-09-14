import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useColors } from '@/theme';

export type ProgressState = 'ok' | 'warning' | 'over';

interface ProgressBarProps {
  /** 0..1 (se recorta). */
  progress: number;
  /** Color de la barra cuando el estado es 'ok'. */
  tone?: 'primary' | 'income';
  /** 'ok' = tone normal, 'warning' = cerca del límite, 'over' = sobregirado.
   * El color nunca es la única señal: quien use esta barra para un dato
   * financiero (presupuesto, crédito usado…) debe reforzar 'warning'/'over'
   * con texto o el ícono `alert` junto al número — ver `BudgetProgressRow`. */
  state?: ProgressState;
}

export function ProgressBar({ progress, tone = 'primary', state = 'ok' }: ProgressBarProps) {
  const colors = useColors();
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const fill =
    state === 'over' ? colors.expense : state === 'warning' ? colors.warning : tone === 'income' ? colors.income : colors.primary;

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [pct, width]);

  // `className` no se resuelve en `Animated.View` de reanimated: todo el
  // estilo (color, radio, ancho animado) va en `style`, no en clases.
  const style = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    height: '100%',
    borderRadius: 999,
    backgroundColor: fill,
  }));

  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <Animated.View style={style} />
    </View>
  );
}
