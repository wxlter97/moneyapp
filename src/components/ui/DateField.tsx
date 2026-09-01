import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ISODate } from '@/api/types';

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
export function DateField({ label, value, onChange, error, maxToday = false }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parseISO(value));

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
    setView(parseISO(value));
    setOpen((o) => !o);
  }

  function pick(d: Date) {
    if (maxToday && d > today) return;
    onChange(toISO(d));
    setOpen(false);
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
        <Text className="text-text-muted">{open ? '▲' : '📅'}</Text>
      </Pressable>

      {error ? <Text className="text-expense text-xs">{error}</Text> : null}

      {open ? (
        <View className="mt-1 rounded-xl border border-border bg-surface p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Pressable
              onPress={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
              className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
              accessibilityLabel="Mes anterior"
            >
              <Text className="text-text text-lg">‹</Text>
            </Pressable>
            <Text className="text-text font-semibold capitalize">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </Text>
            <Pressable
              onPress={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
              className="h-8 w-8 items-center justify-center rounded-lg active:bg-surface-2"
              accessibilityLabel="Mes siguiente"
            >
              <Text className="text-text text-lg">›</Text>
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
        </View>
      ) : null}
    </View>
  );
}
