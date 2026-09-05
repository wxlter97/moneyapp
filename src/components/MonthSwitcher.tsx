import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  addMonths,
  currentYearMonth,
  formatMonthShort,
  formatYearMonth,
  isSameOrAfter,
  type YearMonth,
} from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { FadeInView } from './ui/FadeInView';
import { Icon } from './ui/Icon';

interface MonthSwitcherProps {
  value: YearMonth;
  onChange: (value: YearMonth) => void;
  /** Impide navegar a meses futuros (default false: se permite planificar). */
  clampToCurrent?: boolean;
}

const YEAR_GRID_SPAN = 12;

/**
 * Selector de mes: chevrons para +/-1 mes (uso frecuente) y, tocando la
 * etiqueta central, una rejilla de 12 meses + salto de año para moverse
 * lejos sin tener que tocar la flecha 20 veces.
 */
export function MonthSwitcher({ value, onChange, clampToCurrent = false }: MonthSwitcherProps) {
  const colors = useColors();
  const next = addMonths(value, 1);
  const atCurrent = clampToCurrent && isSameOrAfter(next, addMonths(currentYearMonth(), 1));

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'months' | 'years'>('months');
  const [browseYear, setBrowseYear] = useState(value.year);
  const [yearRangeStart, setYearRangeStart] = useState(value.year - 5);

  function toggle() {
    haptics.tap();
    setBrowseYear(value.year);
    setMode('months');
    setOpen((o) => !o);
  }

  function disabledMonth(month: number) {
    return clampToCurrent && isSameOrAfter({ year: browseYear, month }, addMonths(currentYearMonth(), 1));
  }

  function pickMonth(month: number) {
    if (disabledMonth(month)) return;
    haptics.selection();
    onChange({ year: browseYear, month });
    setOpen(false);
  }

  function pickYear(year: number) {
    haptics.selection();
    setBrowseYear(year);
    setMode('months');
  }

  return (
    <View>
      <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-2 py-2">
        <Pressable
          onPress={() => {
            haptics.tap();
            onChange(addMonths(value, -1));
          }}
          className="h-8 w-10 items-center justify-center rounded-lg active:bg-surface-2"
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Icon name="chevron-left" size={18} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={toggle}
          className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:bg-surface-2"
          accessibilityRole="button"
          accessibilityLabel="Elegir mes y año"
        >
          <Text className="text-text text-base font-semibold capitalize">
            {formatYearMonth(value)}
          </Text>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </Pressable>

        <Pressable
          disabled={atCurrent}
          onPress={() => {
            haptics.tap();
            onChange(next);
          }}
          className={`h-8 w-10 items-center justify-center rounded-lg ${
            atCurrent ? 'opacity-30' : 'active:bg-surface-2'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Icon name="chevron-right" size={18} color={colors.text} />
        </Pressable>
      </View>

      {open ? (
        <FadeInView>
          <View className="mt-1 rounded-xl border border-border bg-surface p-3">
            {mode === 'months' ? (
              <>
                <View className="mb-2 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => setBrowseYear((y) => y - 1)}
                    className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                    accessibilityLabel="Año anterior"
                  >
                    <Icon name="chevron-left" size={18} color={colors.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setYearRangeStart(browseYear - 5);
                      setMode('years');
                    }}
                    className="rounded-lg px-2 py-1 active:bg-surface-2"
                    accessibilityRole="button"
                    accessibilityLabel="Elegir año"
                  >
                    <Text className="text-text font-semibold">{browseYear}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setBrowseYear((y) => y + 1)}
                    className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                    accessibilityLabel="Año siguiente"
                  >
                    <Icon name="chevron-right" size={18} color={colors.text} />
                  </Pressable>
                </View>

                <View className="flex-row flex-wrap">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const selected = browseYear === value.year && month === value.month;
                    const disabled = disabledMonth(month);
                    return (
                      <View key={month} className="w-1/3 p-1">
                        <Pressable
                          disabled={disabled}
                          onPress={() => pickMonth(month)}
                          className={`items-center justify-center rounded-lg py-3 ${
                            selected ? 'bg-primary' : 'active:bg-surface-2'
                          } ${disabled ? 'opacity-25' : ''}`}
                          accessibilityRole="button"
                        >
                          <Text
                            className={`capitalize ${selected ? 'text-primary-fg font-semibold' : 'text-text'}`}
                          >
                            {formatMonthShort({ year: browseYear, month })}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <View className="mb-2 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => setYearRangeStart((y) => y - YEAR_GRID_SPAN)}
                    className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                    accessibilityLabel="Años anteriores"
                  >
                    <Icon name="chevron-left" size={18} color={colors.text} />
                  </Pressable>
                  <Text className="text-text font-semibold">
                    {yearRangeStart} – {yearRangeStart + YEAR_GRID_SPAN - 1}
                  </Text>
                  <Pressable
                    onPress={() => setYearRangeStart((y) => y + YEAR_GRID_SPAN)}
                    className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                    accessibilityLabel="Años siguientes"
                  >
                    <Icon name="chevron-right" size={18} color={colors.text} />
                  </Pressable>
                </View>

                <View className="flex-row flex-wrap">
                  {Array.from({ length: YEAR_GRID_SPAN }, (_, i) => yearRangeStart + i).map((year) => {
                    const selected = year === browseYear;
                    return (
                      <View key={year} className="w-1/3 p-1">
                        <Pressable
                          onPress={() => pickYear(year)}
                          className={`items-center justify-center rounded-lg py-3 ${
                            selected ? 'bg-primary' : 'active:bg-surface-2'
                          }`}
                          accessibilityRole="button"
                        >
                          <Text className={selected ? 'text-primary-fg font-semibold' : 'text-text'}>
                            {year}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </FadeInView>
      ) : null}
    </View>
  );
}
