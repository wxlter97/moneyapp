import type { ISODate } from '@/api/types';

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

/** "agosto 2026" */
export function formatYearMonth({ year, month }: YearMonth): string {
  return `${MONTHS_ES[month - 1]} ${year}`;
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
