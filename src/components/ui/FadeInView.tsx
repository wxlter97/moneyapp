import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

interface FadeInViewProps {
  children: ReactNode;
  /** Escalona la entrada. */
  index?: number;
}

/**
 * Entrada con fundido + deslizamiento, usando el `Animated` del core de RN
 * (fiable en web, a diferencia de los `entering` de reanimated).
 *
 * A diferencia de las animaciones de Reanimated de esta app (que ya
 * respetan "reducir movimiento" solas, por default -- `ReduceMotion.System`
 * desde Reanimated v4, ver `Skeleton.tsx`), el `Animated` del core de RN no
 * tiene ese default: acá hay que chequearlo a mano, o `prefers-reduced-motion`
 * queda sin efecto en el único lugar de la app que no usa Reanimated.
 */
export function FadeInView({ children, index = 0 }: FadeInViewProps) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        v.setValue(1); // salta directo al estado final, sin animar
      } else {
        Animated.timing(v, {
          toValue: 1,
          duration: 240,
          delay: Math.min(index, 8) * 40,
          useNativeDriver: true,
        }).start();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [index, v]);

  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
