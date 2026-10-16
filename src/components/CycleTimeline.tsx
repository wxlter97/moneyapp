import { Text, View } from 'react-native';

import type { ISODate } from '@/api/types';
import { formatShortDate } from '@/lib/date';
import { useColors } from '@/theme';

interface Mark {
  date: ISODate;
  label: string;
  kind: 'cutoff' | 'due' | 'today';
}

function dayNumber(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

/**
 * Dónde está hoy dentro del ciclo de la tarjeta:
 *
 *   corte ── hoy ── vence ── próximo corte
 *
 * Lo comprado antes del corte se paga a la fecha límite; lo de después, en
 * el próximo estado.
 */
export function CycleTimeline({
  cutoff,
  due,
  nextCutoff,
  today,
}: {
  cutoff: ISODate;
  due: ISODate | null;
  nextCutoff: ISODate;
  today: ISODate;
}) {
  const colors = useColors();
  const start = dayNumber(cutoff);
  const span = Math.max(1, dayNumber(nextCutoff) - start);
  const pos = (iso: ISODate) => Math.min(1, Math.max(0, (dayNumber(iso) - start) / span));
  const marks: Mark[] = [
    { date: cutoff, label: `Corte ${formatShortDate(cutoff)}`, kind: 'cutoff' },
    ...(due ? [{ date: due, label: `Vence ${formatShortDate(due)}`, kind: 'due' as const }] : []),
    { date: nextCutoff, label: `Corte ${formatShortDate(nextCutoff)}`, kind: 'cutoff' },
  ];
  const todayPos = pos(today);
  const pastDue = !!due && today > due;

  return (
    <View
      className="gap-2 px-1"
      accessible
      accessibilityLabel={`Ciclo: corte el ${formatShortDate(cutoff)}${
        due ? `, vence el ${formatShortDate(due)}` : ''
      }, próximo corte el ${formatShortDate(nextCutoff)}. Hoy es ${formatShortDate(today)}.`}
    >
      <View className="h-5 justify-center">
        <View className="h-1 rounded-full bg-surface-2" />
        <View
          className="absolute h-1 rounded-full"
          style={{ width: `${todayPos * 100}%`, backgroundColor: pastDue ? colors.expense : colors.primary }}
        />
        {marks.map((m) => (
          <View
            key={`${m.kind}-${m.date}`}
            className="absolute h-3 w-3 rounded-full border-2"
            style={{
              left: `${pos(m.date) * 100}%`,
              marginLeft: -6,
              borderColor: m.kind === 'due' ? colors.warning : colors.textMuted,
              backgroundColor: colors.surface,
            }}
          />
        ))}
        <View
          className="absolute h-5 w-1 rounded-full"
          style={{ left: `${todayPos * 100}%`, marginLeft: -2, backgroundColor: colors.text }}
        />
      </View>
      <View className="flex-row justify-between">
        {marks.map((m) => (
          <Text
            key={`${m.kind}-${m.date}`}
            className="text-[10px]"
            style={{ color: m.kind === 'due' ? colors.warning : colors.textMuted }}
          >
            {m.label}
          </Text>
        ))}
      </View>
      <Text className="text-text-muted text-[10px]" style={{ marginLeft: `${Math.min(todayPos, 0.85) * 100}%` }}>
        ▲ Hoy
      </Text>
    </View>
  );
}
