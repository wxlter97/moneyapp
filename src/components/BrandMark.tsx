import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BrandMarkProps {
  size?: number;
  /** Arranca la animación de entrada al montar (default `true`). */
  animate?: boolean;
}

const SIZE = 120;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const MID = SIZE / 2;
const ARC_LEN = CIRC / 3 - 4; // -4: deja un hueco visible entre los tres arcos

// Tres tonos del mismo acento (azul) — monocromo a propósito, un solo color
// en toda la app en vez de una marca multicolor sobre un chrome neutro.
const ARCS = [
  { color: '#8FB4FF', rotate: -90 },
  { color: '#5B93FF', rotate: 30 },
  { color: '#2A5FE0', rotate: 150 },
] as const;

/**
 * Marca de la app: tres arcos (uno por sección) que se dibujan y convergen
 * en un anillo completo, con un punto central que aparece con un resorte.
 * 100% vectorial — no depende de ningún asset de imagen.
 */
export function BrandMark({ size = SIZE, animate = true }: BrandMarkProps) {
  const scale = size / SIZE;
  const draw0 = useSharedValue(ARC_LEN);
  const draw1 = useSharedValue(ARC_LEN);
  const draw2 = useSharedValue(ARC_LEN);
  const dot = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    [draw0, draw1, draw2].forEach((v, i) => {
      v.value = withDelay(
        160 + i * 150,
        withTiming(0, { duration: 620, easing: Easing.out(Easing.cubic) }),
      );
    });
    dot.value = withDelay(760, withSpring(1, { damping: 9, stiffness: 140 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  const props0 = useAnimatedProps(() => ({ strokeDashoffset: draw0.value }));
  const props1 = useAnimatedProps(() => ({ strokeDashoffset: draw1.value }));
  const props2 = useAnimatedProps(() => ({ strokeDashoffset: draw2.value }));
  const arcProps = [props0, props1, props2];

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot.value }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {ARCS.map((arc, i) => (
          <AnimatedCircle
            key={arc.color}
            cx={MID}
            cy={MID}
            r={R}
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${ARC_LEN} ${CIRC}`}
            animatedProps={arcProps[i]}
            transform={`rotate(${arc.rotate} ${MID} ${MID})`}
          />
        ))}
      </Svg>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: SIZE * 0.16 * scale,
            height: SIZE * 0.16 * scale,
            borderRadius: SIZE * 0.08 * scale,
            backgroundColor: '#F2F4F7',
          },
          dotStyle,
        ]}
      />
    </View>
  );
}
