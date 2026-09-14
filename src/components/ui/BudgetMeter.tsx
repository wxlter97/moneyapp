import { useEffect, useId } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { budgetState } from '@/lib/budgetState';
import { formatMoney } from '@/lib/money';
import { useColors } from '@/theme';
import { mono } from '@/theme/typography';

/**
 * Medidor de presupuesto -- identidad wxlter. (Fase 3, sep 2026). Reemplaza
 * el anillo de progreso de `budgets.tsx`: no es un adorno circular, es una
 * regla. La pista representa hasta `TRACK_SCALE` × el presupuesto, dejando
 * espacio visible al exceso; el límite (100%) siempre se marca con un pin
 * de acento (identidad, nunca semántica -- por eso usa `colors.primary`, no
 * un color de estado). El relleno sí es semántico: verde/ámbar bajo el
 * límite (`useColors().income`/`.warning`), rojo con trama diagonal en la
 * porción que lo excede -- misma lógica de 3 estados que `BudgetProgressRow`
 * (`budgetState`, compartida), sólo cambia cómo se dibuja.
 */
const TRACK_SCALE = 1.3;
const LIMIT_POS = 100 / TRACK_SCALE; // ~76.9%

interface BudgetMeterProps {
  spent: number;
  budgeted: number;
  currency?: string;
  /** 'lg' para el total del período (con pin rotulado), 'sm' para filas de
   * categoría (pin sin rótulo, pista más fina). */
  size?: 'sm' | 'lg';
  /** Etiquetas $0 / presupuesto bajo la pista. Sólo tiene sentido en 'lg'. */
  showTicks?: boolean;
}

export function BudgetMeter({
  spent,
  budgeted,
  currency = 'USD',
  size = 'lg',
  showTicks = false,
}: BudgetMeterProps) {
  const colors = useColors();
  const patternId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { state, ratio, noBudget } = budgetState(spent, budgeted);
  const trackHeight = size === 'sm' ? 8 : 14;
  const isLg = size === 'lg';

  const fillColor = state === 'over' ? colors.expense : state === 'warning' ? colors.warning : colors.income;
  const fillPct = noBudget ? 100 : Math.min(ratio, TRACK_SCALE) * (100 / TRACK_SCALE);
  const isOverPastLimit = state === 'over' && !noBudget;
  const baseFillPct = isOverPastLimit ? LIMIT_POS : fillPct;
  const overWidthPct = isOverPastLimit ? Math.max(0, fillPct - LIMIT_POS) : 0;

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(baseFillPct, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [baseFillPct, width]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    height: '100%',
    backgroundColor: noBudget ? 'transparent' : fillColor,
  }));

  const a11yLabel = noBudget
    ? `Sin presupuesto asignado, gastado ${formatMoney(spent, currency)}`
    : `${formatMoney(spent, currency)} de ${formatMoney(budgeted, currency)}, ${
        state === 'over' ? 'excedido' : state === 'warning' ? 'cerca del límite' : 'dentro del presupuesto'
      }`;

  return (
    <View accessible accessibilityLabel={a11yLabel} style={{ gap: 6 }}>
      <View
        style={{
          height: trackHeight,
          borderRadius: trackHeight / 2,
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flex: 1, borderRadius: trackHeight / 2, overflow: 'hidden' }}>
          <Animated.View style={fillStyle} />
          {noBudget ? <HatchOverlay id={`${patternId}nb`} color={colors.expense} /> : null}
        </View>
        {overWidthPct > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${LIMIT_POS}%`,
              width: `${overWidthPct}%`,
              overflow: 'hidden',
              borderTopRightRadius: trackHeight / 2,
              borderBottomRightRadius: trackHeight / 2,
            }}
          >
            <HatchOverlay id={`${patternId}ov`} color={colors.expense} />
          </View>
        ) : null}
        {!noBudget ? (
          <View
            style={{
              position: 'absolute',
              left: `${LIMIT_POS}%`,
              top: -trackHeight * 0.4,
              bottom: -trackHeight * 0.4,
              width: 2,
              marginLeft: -1,
              backgroundColor: colors.primary,
            }}
          >
            {isLg ? (
              <View style={{ position: 'absolute', top: -17, left: '50%', transform: [{ translateX: -15 }] }}>
                <View style={{ backgroundColor: colors.primary, borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1 }}>
                  <Text style={{ fontFamily: mono.semibold, fontSize: 8.5, letterSpacing: 0.4, color: colors.primaryFg }}>
                    LÍMITE
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {noBudget && isLg ? (
        <Text style={{ fontFamily: mono.semibold, fontSize: 9.5, letterSpacing: 0.4, color: colors.expense }}>
          SIN PRESUPUESTO
        </Text>
      ) : null}

      {showTicks && !noBudget ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: mono.regular, fontSize: 10, color: colors.textMuted }}>
            {formatMoney(0, currency)}
          </Text>
          <Text style={{ fontFamily: mono.regular, fontSize: 10, color: colors.textMuted }}>
            {formatMoney(budgeted, currency)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Trama diagonal (la porción de la pista que excede el límite, o toda la
 * pista cuando no hay presupuesto asignado) -- `id` único por instancia:
 * varios medidores conviven en una misma pantalla (una fila por categoría) y
 * un `<Pattern>` es una referencia por id dentro del documento SVG. */
function HatchOverlay({ id, color }: { id: string; color: string }) {
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={7} height={7} patternTransform="rotate(45)">
          <Rect width={7} height={7} fill={color} />
          <Line x1={0} y1={0} x2={0} y2={7} stroke="#000000" strokeOpacity={0.32} strokeWidth={3.5} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
