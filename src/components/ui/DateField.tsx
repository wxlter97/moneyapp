import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ISODate } from '@/api/types';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { FadeInView } from './FadeInView';
import { Icon } from './Icon';

interface DateFieldProps {
  label: string;
  value: ISODate;
  onChange: (value: ISODate) => void;
  error?: string;
  /** No permitir fechas futuras. */
  maxToday?: boolean;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date): ISODate =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: ISODate): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
};

function formatLong(iso: ISODate): string {
  const d = parseISO(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Selector de fecha con calendario en línea (sin Modal ni dependencias nativas).
 * Funciona igual en web, iOS y Android; el panel empuja el contenido del
 * formulario (que va dentro de un ScrollView).
 */
type PickerMode = 'days' | 'months' | 'years';

export function DateField({ label, value, onChange, error, maxToday = false }: DateFieldProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parseISO(value));
  const [mode, setMode] = useState<PickerMode>('days');
  // Rango de la grilla de años: se recalcula cada vez que se entra a ese modo.
  const [yearRangeStart, setYearRangeStart] = useState(() => parseISO(value).getFullYear() - 5);

  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(new Date(year, month, d));
    return list;
  }, [view]);

  function toggle() {
    haptics.tap();
    setView(parseISO(value));
    setMode('days');
    setOpen((o) => !o);
  }

  function pick(d: Date) {
    if (maxToday && d > today) return;
    haptics.selection();
    onChange(toISO(d));
    setOpen(false);
  }

  function openMonths() {
    haptics.tap();
    setYearRangeStart(view.getFullYear() - 5);
    setMode('months');
  }

  function pickMonth(monthIndex: number) {
    haptics.selection();
    setView((v) => new Date(v.getFullYear(), monthIndex, 1));
    setMode('days');
  }

  function pickYear(year: number) {
    haptics.selection();
    setView((v) => new Date(year, v.getMonth(), 1));
    setMode('months');
  }

  return (
    <View className="gap-1.5">
      <Text className="text-text-muted text-sm">{label}</Text>

      <Pressable
        onPress={toggle}
        className={`h-12 flex-row items-center justify-between rounded-xl border px-3 ${
          open ? 'border-primary' : error ? 'border-expense' : 'border-border'
        } bg-surface active:opacity-80`}
        accessibilityRole="button"
      >
        <Text className="text-text">{formatLong(value)}</Text>
        <Icon name={open ? 'chevron-up' : 'calendar'} size={18} color={colors.textMuted} />
      </Pressable>

      {error ? <Text className="text-expense text-xs">{error}</Text> : null}

      {open ? (
        <FadeInView>
        <View className="mt-1 rounded-xl border border-border bg-surface p-3">
          {mode === 'days' ? (
            <>
              <View className="mb-2 flex-row items-center justify-between">
                <Pressable
                  onPress={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                  className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                  accessibilityLabel="Mes anterior"
                >
                  <Icon name="chevron-left" size={18} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={openMonths}
                  className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:bg-surface-2"
                  accessibilityRole="button"
                  accessibilityLabel="Elegir mes y año"
                >
                  <Text className="text-text font-semibold capitalize">
                    {MONTHS[view.getMonth()]} {view.getFullYear()}
                  </Text>
                  <Icon name="chevron-down" size={14} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                  className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                  accessibilityLabel="Mes siguiente"
                >
                  <Icon name="chevron-right" size={18} color={colors.text} />
                </Pressable>
              </View>

              <View className="flex-row">
                {WEEKDAYS.map((w, i) => (
                  <View key={i} className="flex-1 items-center py-1">
                    <Text className="text-text-muted text-xs">{w}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {cells.map((d, i) => {
                  if (!d) return <View key={i} className="h-9 w-[14.28%]" />;
                  const selected = toISO(d) === value;
                  const disabled = maxToday && d > today;
                  return (
                    <View key={i} className="w-[14.28%] p-0.5">
                      <Pressable
                        disabled={disabled}
                        onPress={() => pick(d)}
                        className={`h-8 items-center justify-center rounded-lg ${
                          selected ? 'bg-primary' : 'active:bg-surface-2'
                        } ${disabled ? 'opacity-25' : ''}`}
                        accessibilityRole="button"
                        accessibilityLabel={toISO(d)}
                      >
                        <Text
                          className={selected ? 'text-primary-fg font-semibold' : 'text-text'}
                        >
                          {d.getDate()}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <Pressable
                onPress={() => pick(today)}
                className="mt-1 items-center rounded-lg py-2 active:bg-surface-2"
                accessibilityRole="button"
              >
                <Text className="text-primary text-sm font-semibold">Hoy</Text>
              </Pressable>
            </>
          ) : mode === 'months' ? (
            <>
              <View className="mb-2 flex-row items-center justify-between">
                <Pressable
                  onPress={() => setView((v) => new Date(v.getFullYear() - 1, v.getMonth(), 1))}
                  className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                  accessibilityLabel="Año anterior"
                >
                  <Icon name="chevron-left" size={18} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => setMode('years')}
                  className="rounded-lg px-2 py-1 active:bg-surface-2"
                  accessibilityRole="button"
                  accessibilityLabel="Elegir año"
                >
                  <Text className="text-text font-semibold">{view.getFullYear()}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setView((v) => new Date(v.getFullYear() + 1, v.getMonth(), 1))}
                  className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                  accessibilityLabel="Año siguiente"
                >
                  <Icon name="chevron-right" size={18} color={colors.text} />
                </Pressable>
              </View>

              <View className="flex-row flex-wrap">
                {MONTHS.map((m, i) => {
                  const selected = i === view.getMonth();
                  return (
                    <View key={m} className="w-1/3 p-1">
                      <Pressable
                        onPress={() => pickMonth(i)}
                        className={`items-center justify-center rounded-lg py-3 ${
                          selected ? 'bg-primary' : 'active:bg-surface-2'
                        }`}
                        accessibilityRole="button"
                      >
                        <Text
                          className={`capitalize ${selected ? 'text-primary-fg font-semibold' : 'text-text'}`}
                        >
                          {m.slice(0, 3)}
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
                  onPress={() => setYearRangeStart((y) => y - 12)}
                  className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                  accessibilityLabel="12 años antes"
                >
                  <Icon name="chevron-left" size={18} color={colors.text} />
                </Pressable>
                <Text className="text-text font-semibold">
                  {yearRangeStart} – {yearRangeStart + 11}
                </Text>
                <Pressable
                  onPress={() => setYearRangeStart((y) => y + 12)}
                  className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
                  accessibilityLabel="12 años después"
                >
                  <Icon name="chevron-right" size={18} color={colors.text} />
                </Pressable>
              </View>

              <View className="flex-row flex-wrap">
                {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((y) => {
                  const selected = y === view.getFullYear();
                  return (
                    <View key={y} className="w-1/3 p-1">
                      <Pressable
                        onPress={() => pickYear(y)}
                        className={`items-center justify-center rounded-lg py-3 ${
                          selected ? 'bg-primary' : 'active:bg-surface-2'
                        }`}
                        accessibilityRole="button"
                      >
                        <Text className={selected ? 'text-primary-fg font-semibold' : 'text-text'}>
                          {y}
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
