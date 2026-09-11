import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { BrandMark } from './BrandMark';
import { fonts } from '@/theme/typography';

interface SplashOverlayProps {
  /** La app ya tiene todo listo para mostrarse (bootstrap de auth resuelto). */
  ready: boolean;
  /** Se llama cuando termina la animación de salida: desmontar el overlay. */
  onFinished: () => void;
}

// Coincide con `backgroundColor` del splash nativo en app.json: el handoff
// entre el splash del sistema y este overlay es invisible. Papel (wxlter.),
// no el fondo oscuro del tema interno de la app — el splash es un momento
// de marca fijo, independiente del tema claro/oscuro que elija el usuario.
const SPLASH_BG = '#f4f3ef';
const MIN_HOLD_MS = 1250;

/**
 * Splash animado propio, no genérico: se muestra apenas se oculta el splash
 * nativo (mismo color de fondo, sin parpadeo) y encima dibuja la marca de la
 * app con un resorte, para dar una primera impresión con personalidad antes
 * de entrar al dashboard. Plano — sin degradado ni resplandor difuminado,
 * acorde al sistema wxlter. (sin blur, sin sombras).
 */
export function SplashOverlay({ ready, onFinished }: SplashOverlayProps) {
  const [minHoldDone, setMinHoldDone] = useState(false);

  const overlayOpacity = useSharedValue(1);
  const markScale = useSharedValue(0.9);
  const wordOpacity = useSharedValue(0);
  const wordY = useSharedValue(8);

  useEffect(() => {
    const t = setTimeout(() => setMinHoldDone(true), MIN_HOLD_MS);
    markScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.2)) });
    wordOpacity.value = withDelay(650, withTiming(1, { duration: 420 }));
    wordY.value = withDelay(650, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !minHoldDone) return;
    markScale.value = withTiming(1.08, { duration: 380, easing: Easing.in(Easing.cubic) });
    overlayOpacity.value = withDelay(
      80,
      withTiming(0, { duration: 340 }, (finished) => {
        if (finished) runOnJS(onFinished)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, minHoldDone]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: markScale.value }] }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BG }, overlayStyle]} pointerEvents="none">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Animated.View style={markStyle}>
          <BrandMark size={112} />
        </Animated.View>
        <Animated.View style={wordStyle}>
          <Text style={{ color: '#111111', fontSize: 24, fontFamily: fonts.extrabold, letterSpacing: -0.5 }}>
            budget
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
