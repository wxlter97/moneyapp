import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface FadeInViewProps {
  children: ReactNode;
  /** Escalona la entrada. */
  index?: number;
}

/**
 * Entrada con fundido + deslizamiento, usando el `Animated` del core de RN
 * (fiable en web, a diferencia de los `entering` de reanimated).
 */
export function FadeInView({ children, index = 0 }: FadeInViewProps) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 240,
      delay: Math.min(index, 8) * 40,
      useNativeDriver: true,
    }).start();
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
