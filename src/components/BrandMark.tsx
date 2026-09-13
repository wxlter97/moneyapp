import { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface BrandMarkProps {
  size?: number;
  /** Arranca la animación de entrada al montar (default `true`). */
  animate?: boolean;
}

/**
 * Marca de la app: el mismo arte que el ícono (piggy bank), no una versión
 * vectorial aparte -- antes esto dibujaba tres arcos abstractos propios que
 * habían quedado desactualizados cuando el ícono cambió de arte (ver
 * `assets/images/icon.png`, ya usado también para el ícono de la PWA).
 * Simple pop-in con resorte al montar; sin el dibujo progresivo de antes.
 */
export function BrandMark({ size = 64, animate = true }: BrandMarkProps) {
  const scale = useSharedValue(animate ? 0.85 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    scale.value = withSpring(1, { damping: 12, stiffness: 140 });
    opacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Image
        source={require('../../assets/images/icon.png')}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      />
    </Animated.View>
  );
}
