import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/theme';

export type ProgressState = 'ok' | 'warning' | 'over';

/** 0/1/2 para interpolar color entre ok/warning/over -- compartido con
 * `BudgetMeter`, que tiene el mismo problema de "el color salta de golpe al
 * cruzar de estado" sobre los mismos 3 colores. */
export const PROGRESS_STATE_INDEX: Record<ProgressState, number> = { ok: 0, warning: 1, over: 2 };

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
  const okColor = tone === 'income' ? colors.income : colors.primary;

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [pct, width]);

  // El color, no sólo el ancho, también anima -- antes saltaba de golpe al
  // cruzar 80%/100% (pedido de la auditoría de producto, Fase 6): un
  // `stateIndex` (0/1/2) que interpola entre los 3 colores reales en vez de
  // reasignar `backgroundColor` de un React re-render al siguiente.
  const stateIndex = useSharedValue(PROGRESS_STATE_INDEX[state]);
  useEffect(() => {
    stateIndex.value = withTiming(PROGRESS_STATE_INDEX[state], { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [state, stateIndex]);

  // `className` no se resuelve en `Animated.View` de reanimated: todo el
  // estilo (color, radio, ancho animado) va en `style`, no en clases.
  const style = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    height: '100%',
    borderRadius: 999,
    backgroundColor: interpolateColor(stateIndex.value, [0, 1, 2], [okColor, colors.warning, colors.expense]),
  }));

  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <Animated.View style={style} />
    </View>
  );
}
