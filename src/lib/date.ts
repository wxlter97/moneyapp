import type { ISODate, ISODateTime } from '@/api/types';

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export function currentYearMonth(now = new Date()): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

export function isSameOrAfter(a: YearMonth, b: YearMonth): boolean {
  return a.year > b.year || (a.year === b.year && a.month >= b.month);
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "Agosto 2026" */
export function formatYearMonth({ year, month }: YearMonth): string {
  const name = MONTHS_ES[month - 1] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

const MONTHS_SHORT_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** "ago" -- para etiquetas de eje en gráficos donde no entra el nombre completo. */
export function formatMonthShort({ month }: YearMonth): string {
  return MONTHS_SHORT_ES[month - 1] ?? '';
}

/** Primer y último día del mes como ISODate (YYYY-MM-DD). */
export function monthRange({ year, month }: YearMonth): { from: ISODate; to: ISODate } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export function todayISO(now = new Date()): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "31 ago" — fecha corta para listas. */
export function formatShortDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_ES[m - 1]?.slice(0, 3) ?? ''}`;
}

/** "31 ago, 14:05" — fecha y hora, p. ej. el último uso de un token. */
export function formatDateTime(iso: ISODateTime): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]?.slice(0, 3) ?? ''}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "hoy" / "ayer" / "vie 29 ago" — encabezado de día en el historial. */
export function formatDayHeader(iso: ISODate, now = new Date()): string {
  if (iso === todayISO(now)) return 'hoy';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (iso === todayISO(yesterday)) return 'ayer';

  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const wd = WEEKDAYS_ES[new Date(y, m - 1, d).getDay()] ?? '';
  return `${wd} ${d} ${MONTHS_ES[m - 1]?.slice(0, 3) ?? ''}`;
}
