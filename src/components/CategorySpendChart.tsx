import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import type { SpendRow } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';

const PALETTE = ['#4F8CFF', '#FF9F5A', '#5AD1A6', '#F26D6D', '#B18CFF', '#FFD166'];

interface CategorySpendChartProps {
  rows: SpendRow[];
  currency: string;
  /** Color de la categoría (el punto que ya se usa en `TransactionRow`). */
  categoryColor: (id: string) => string | undefined;
}

/**
 * Anillo de gasto por categoría (top N que ya trae `/reports/summary/`) +
 * leyenda. Un solo `Svg` con un `Circle` por segmento (truco del
 * `strokeDasharray`/`strokeDashoffset`), rotado -90° para arrancar arriba.
 */
export function CategorySpendChart({ rows, currency, categoryColor }: CategorySpendChartProps) {
  const colors = useColors();
  const segments = rows.map((r, i) => ({
    ...r,
    value: toNumber(r.spent),
    color: categoryColor(r.category) ?? PALETTE[i % PALETTE.length],
  }));
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (segments.length === 0 || total <= 0) {
    return <Text className="text-text-muted py-3 text-sm">Sin gastos este mes.</Text>;
  }

  const size = 128;
  const radius = 48;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View className="flex-row items-center gap-4 py-1">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* `rotation`/`originX`/`originY` de <G> emiten un DOM prop inválido
            en react-native-svg web; con `transform` (SVG estándar) no pasa. */}
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surface2}
            strokeWidth={stroke}
            fill="none"
          />
          {segments.map((seg) => {
            const dash = (seg.value / total) * circumference;
            const piece = (
              <Circle
                key={seg.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                fill="none"
              />
            );
            offset += dash;
            return piece;
          })}
        </G>
      </Svg>

      <View className="flex-1 gap-2.5">
        {segments.slice(0, 5).map((seg) => (
          <View key={seg.category} className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <Text className="text-text flex-1 text-xs" numberOfLines={1}>
              {seg.category_name ?? 'Sin categoría'}
            </Text>
            <Money value={seg.value} currency={currency} tone="muted" className="text-xs" />
          </View>
        ))}
      </View>
    </View>
  );
}
