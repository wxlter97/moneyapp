import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BrandMark } from './BrandMark';

interface SplashOverlayProps {
  /** La app ya tiene todo listo para mostrarse (bootstrap de auth resuelto). */
  ready: boolean;
  /** Se llama cuando termina la animación de salida: desmontar el overlay. */
  onFinished: () => void;
}

// Coincide con `backgroundColor` del splash nativo en app.json: el handoff
// entre el splash del sistema y este overlay es invisible.
const SPLASH_BG = '#0B0D10';
const MIN_HOLD_MS = 1250;

/**
 * Splash animado propio, no genérico: se muestra apenas se oculta el splash
 * nativo (mismo color de fondo, sin parpadeo) y encima dibuja la marca de la
 * app con un resorte + degradado con movimiento, para dar una primera
 * impresión con personalidad antes de entrar al dashboard.
 */
export function SplashOverlay({ ready, onFinished }: SplashOverlayProps) {
  const [minHoldDone, setMinHoldDone] = useState(false);

  const overlayOpacity = useSharedValue(1);
  const markScale = useSharedValue(0.9);
  const glow = useSharedValue(0.5);
  const wordOpacity = useSharedValue(0);
  const wordY = useSharedValue(8);

  useEffect(() => {
    const t = setTimeout(() => setMinHoldDone(true), MIN_HOLD_MS);
    markScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.2)) });
    wordOpacity.value = withDelay(650, withTiming(1, { duration: 420 }));
    wordY.value = withDelay(650, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0.5, { duration: 1400 })), -1, true);
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
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.35, transform: [{ scale: 0.8 + glow.value * 0.3 }] }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BG }, overlayStyle]} pointerEvents="none">
      <LinearGradient
        colors={['#101528', SPLASH_BG, SPLASH_BG]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: '50%', left: '50%', marginLeft: -170, marginTop: -190 },
          glowStyle,
        ]}
      >
        {/* Tres círculos concéntricos con opacidad decreciente: aproximan un
            resplandor radial suave sin depender de un blur real. */}
        <View style={{ width: 340, height: 340, borderRadius: 170, backgroundColor: '#3D6BE0', opacity: 0.14 }} />
        <View style={{ position: 'absolute', top: 60, left: 60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#5B93FF', opacity: 0.18 }} />
        <View style={{ position: 'absolute', top: 110, left: 110, width: 120, height: 120, borderRadius: 60, backgroundColor: '#8FB4FF', opacity: 0.26 }} />
      </Animated.View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Animated.View style={markStyle}>
          <BrandMark size={112} />
        </Animated.View>
        <Animated.View style={wordStyle}>
          <Text style={{ color: '#F2F4F7', fontSize: 22, fontWeight: '700', letterSpacing: 1 }}>
            budget
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
