import { Fragment, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import type { CashflowPoint } from '@/api/types';
import { formatMonthShort } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';

interface CashflowChartProps {
  /** Orden ascendente: más antiguo primero. */
  points: CashflowPoint[];
  height?: number;
}

/**
 * Barras pareadas ingreso/gasto por mes -- mismo truco de `NetWorthChart`
 * (mide su ancho con `onLayout`, arma el `viewBox` a esos píxeles). Las
 * etiquetas de mes van en una fila de `Text` aparte, no dentro del `Svg`:
 * alinearlas ahí a mano sería más frágil que dejarle el layout a flexbox.
 */
export function CashflowChart({ points, height = 130 }: CashflowChartProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);

  const bars = useMemo(() => {
    if (width <= 0 || points.length === 0) return null;
    const max = Math.max(...points.flatMap((p) => [toNumber(p.income), toNumber(p.expenses)]), 1);
    const n = points.length;
    const groupWidth = width / n;
    const barWidth = Math.min(groupWidth * 0.3, 20);
    const gap = 3;

    return points.map((p, i) => {
      const center = i * groupWidth + groupWidth / 2;
      const incomeH = Math.max((toNumber(p.income) / max) * height, toNumber(p.income) > 0 ? 2 : 0);
      const expenseH = Math.max((toNumber(p.expenses) / max) * height, toNumber(p.expenses) > 0 ? 2 : 0);
      return {
        key: `${p.year}-${p.month}`,
        incomeX: center - barWidth - gap / 2,
        expenseX: center + gap / 2,
        incomeH,
        expenseH,
        barWidth,
      };
    });
  }, [width, height, points]);

  return (
    <View className="gap-1.5">
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {bars ? (
          <Svg width={width} height={height}>
            {bars.map((b) => (
              <Fragment key={b.key}>
                <Rect
                  x={b.incomeX}
                  y={height - b.incomeH}
                  width={b.barWidth}
                  height={b.incomeH}
                  rx={3}
                  fill={colors.income}
                />
                <Rect
                  x={b.expenseX}
                  y={height - b.expenseH}
                  width={b.barWidth}
                  height={b.expenseH}
                  rx={3}
                  fill={colors.expense}
                />
              </Fragment>
            ))}
          </Svg>
        ) : null}
      </View>
      <View className="flex-row">
        {points.map((p) => (
          <Text key={`${p.year}-${p.month}`} className="text-text-muted flex-1 text-center text-[10px]">
            {formatMonthShort(p)}
          </Text>
        ))}
      </View>
    </View>
  );
}
