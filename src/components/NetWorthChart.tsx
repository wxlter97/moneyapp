import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { MonthlySnapshot } from '@/api/types';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';

interface NetWorthChartProps {
  /** Orden ascendente: más antiguo primero. */
  snapshots: MonthlySnapshot[];
  height?: number;
}

/**
 * Línea de evolución del patrimonio neto. Mide su propio ancho con
 * `onLayout` y arma el `viewBox` a esos mismos píxeles (1:1, sin
 * `preserveAspectRatio`) para que el trazo y los puntos no salgan
 * estirados de forma no uniforme.
 */
export function NetWorthChart({ snapshots, height = 150 }: NetWorthChartProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);

  const geometry = useMemo(() => {
    if (width <= 0 || snapshots.length === 0) return null;
    const values = snapshots.map((s) => toNumber(s.total_net_worth));
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const span = max - min || 1;
    const pad = 10;
    const n = values.length;

    const points = values.map((v, i) => ({
      x: n <= 1 ? width / 2 : pad + (i / (n - 1)) * (width - pad * 2),
      y: pad + (1 - (v - min) / span) * (height - pad * 2),
    }));
    const zeroY = pad + (1 - (0 - min) / span) * (height - pad * 2);
    const path = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    return { points, path, showZeroLine: min < 0 && max > 0, zeroY };
  }, [width, height, snapshots]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {geometry ? (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {geometry.showZeroLine ? (
            <Line
              x1={0}
              y1={geometry.zeroY}
              x2={width}
              y2={geometry.zeroY}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4 5"
            />
          ) : null}
          <Path
            d={geometry.path}
            stroke={colors.primary}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {geometry.points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === geometry.points.length - 1 ? 4.5 : 3}
              fill={i === geometry.points.length - 1 ? colors.primary : colors.surface}
              stroke={colors.primary}
              strokeWidth={2}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
