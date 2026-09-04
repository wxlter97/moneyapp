import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useColors } from '@/theme';

interface RingProps {
  /** 0–1; se recorta al rango. */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
}

/** Anillo de progreso (SVG). El contenido central va como `children`. */
export function Ring({
  progress,
  size = 220,
  stroke = 18,
  color,
  trackColor,
  children,
}: RingProps) {
  const c = useColors();
  const strokeColor = color ?? c.income;
  const track = trackColor ?? c.surface2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const offset = circ * (1 - clamped);
  const mid = size / 2;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={mid} cy={mid} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={mid}
          cy={mid}
          r={r}
          stroke={strokeColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${mid} ${mid})`}
        />
      </Svg>
      <View className="items-center px-6">{children}</View>
    </View>
  );
}
