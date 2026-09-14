import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useColors } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  className?: string;
}

/**
 * Bloque de carga placeholder -- pulso de opacidad en vez del spinner
 * centrado de `LoadingState`, para pantallas con más contenido (Vista
 * general, detalle de cartera) donde un spinner deja la forma real de la
 * pantalla en blanco hasta que llega el dato en vez de anticiparla.
 *
 * "Reducir movimiento" no necesita código acá: Reanimated ya lo respeta por
 * default (`ReduceMotion.System` en `withRepeat`/`withTiming` desde la v4,
 * confirmado contra el código de la librería) -- con esa preferencia activa
 * el pulso simplemente no arranca, sin rama especial (ver Fase 6 en
 * docs/audit-tasks.md).
 */
export function Skeleton({ width = '100%', height = 16, radius = 8, className = '' }: SkeletonProps) {
  const colors = useColors();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      className={className}
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface2 }, style]}
    />
  );
}

/** Fila placeholder con la misma forma que `TransactionRow` (avatar circular
 * de 40 + título/subtítulo apilados + monto a la derecha) -- para listas de
 * movimientos (detalle de cartera, y reusable donde haga falta después). */
export function TransactionRowSkeleton() {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <Skeleton width={40} height={40} radius={20} />
      <View className="flex-1 gap-2">
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={64} height={14} />
    </View>
  );
}

/** `rows` filas de `TransactionRowSkeleton` dentro de una card, como las
 * listas reales -- para el estado de carga de una pantalla que agrupa
 * movimientos por día. */
export function TransactionListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      <Skeleton width={90} height={11} radius={4} className="mb-2 ml-1" />
      <View className="gap-0 overflow-hidden rounded-3xl border border-border/60 bg-surface/95 px-4">
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i}>
            {i > 0 ? <View className="h-px bg-border/30" /> : null}
            <TransactionRowSkeleton />
          </View>
        ))}
      </View>
    </View>
  );
}
