import { Pressable, Text, View } from 'react-native';

import type { ISODate } from '@/api/types';
import { todayISO, type YearMonth } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/** Qué marcar en el día: puntos de color, no el detalle -- ese va en la
 * lista de abajo una vez que se toca el día (ver `CalendarTab`). */
export interface DayMarker {
  income: boolean;
  expense: boolean;
  /** Recurrente/cuota/pago de tarjeta/vencimiento sin registrar todavía
   * (siempre en el futuro -- ver `upcoming_scheduled` en el backend). */
  scheduled: boolean;
}

interface CalendarGridProps {
  month: YearMonth;
  /** `period_start`-style: cualquier ISODate, acá siempre dentro de `month`. */
  selected: ISODate;
  /** Por día (`YYYY-MM-DD`) dentro de `month`. Los días sin entrada no
   * llevan puntos. */
  markers: Record<string, DayMarker>;
  onSelectDay: (date: ISODate) => void;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CELL_WIDTH = `${100 / 7}%`;
const CELL_HEIGHT = 44;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Grilla de mes (lunes a domingo, como el resto de la app -- ver
 * `lib/periods.ts`). Cada día con actividad lleva hasta 3 puntos (ingreso /
 * gasto / programado); tocar un día no muestra el detalle acá, sólo lo
 * selecciona -- el detalle vive aparte para no amontonar todo en la celda.
 */
export function CalendarGrid({ month, selected, markers, onSelectDay }: CalendarGridProps) {
  const colors = useColors();
  const today = todayISO();

  const firstWeekday = (new Date(month.year, month.month - 1, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(month.year, month.month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null); // filas siempre completas

  return (
    <View className="gap-1.5">
      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={{ width: CELL_WIDTH }} className="items-center">
            <Text className="text-text-muted text-[11px]" style={{ fontFamily: fonts.semibold }}>
              {w}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={i} style={{ width: CELL_WIDTH, height: CELL_HEIGHT }} />;
          }
          const iso = `${month.year}-${pad(month.month)}-${pad(day)}`;
          const marker = markers[iso];
          const isToday = iso === today;
          const isSelected = iso === selected;
          const dotColor = isSelected ? colors.primaryFg : undefined;

          return (
            <View key={i} style={{ width: CELL_WIDTH, height: CELL_HEIGHT, padding: 2 }}>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  onSelectDay(iso);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${day} de ${month.month}`}
                className={`flex-1 items-center justify-center rounded-xl ${
                  isSelected ? 'bg-primary' : isToday ? 'border border-primary' : ''
                }`}
              >
                <Text
                  className={isSelected ? 'text-primary-fg text-sm' : 'text-text text-sm'}
                  style={{ fontFamily: isToday || isSelected ? fonts.bold : fonts.regular }}
                >
                  {day}
                </Text>
                <View className="mt-0.5 h-1.5 flex-row items-center gap-0.5">
                  {marker?.income ? (
                    <View className="h-1 w-1 rounded-full" style={{ backgroundColor: dotColor ?? colors.income }} />
                  ) : null}
                  {marker?.expense ? (
                    <View className="h-1 w-1 rounded-full" style={{ backgroundColor: dotColor ?? colors.expense }} />
                  ) : null}
                  {marker?.scheduled ? (
                    <View
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: dotColor ?? colors.textMuted }}
                    />
                  ) : null}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
