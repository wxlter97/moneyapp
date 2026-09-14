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
 * habían quedado desactualizados cuando el ícono cambió de arte.
 *
 * Usa `brand-mark.webp` (512x512, ~6KB) en vez de `assets/images/icon.png`
 * (1024x1024, ~780KB, la fuente para los íconos nativos vía app.json): acá el
 * tamaño máximo renderizado es 112px, así que servir el PNG completo era
 * bajar ~780KB para pintar un logo de un poco más de 100px de lado.
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
        source={require('../../assets/images/brand-mark.webp')}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      />
    </Animated.View>
  );
}
