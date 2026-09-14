import type { BudgetPeriod, ISODate } from '@/api/types';

/**
 * Aritmética de "período de presupuesto" (ver `Workspace.budget_period`):
 * espejo en el cliente de `apps.common.periods` en el backend, para poder
 * navegar/etiquetar períodos sin ida y vuelta al servidor. Un período se
 * identifica siempre por su fecha de inicio (`period_start`), nunca por
 * índice -- igual que del lado del backend.
 *
 * Todo acá opera sobre componentes año/mes/día locales (nunca
 * `Date.parse` de un string ISO, que en JS se interpreta en UTC y puede
 * correr un día para el usuario según su zona horaria -- mismo cuidado que
 * ya toma `lib/date.ts`).
 */

function toDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(iso: ISODate, delta: number): ISODate {
  const d = toDate(iso);
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

function lastDayOfMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** Inicio del período de tipo `period` que contiene a `iso`. */
export function periodStart(iso: ISODate, period: BudgetPeriod): ISODate {
  const d = toDate(iso);
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (period) {
    case 'daily':
      return iso;
    case 'weekly': {
      const dow = (d.getDay() + 6) % 7; // 0 = lunes
      return addDays(iso, -dow);
    }
    case 'biweekly':
      return toISO(new Date(y, m, d.getDate() <= 15 ? 1 : 16));
    case 'monthly':
      return toISO(new Date(y, m, 1));
    case 'yearly':
      return toISO(new Date(y, 0, 1));
  }
}

/** Último día (inclusive) del período que arranca en `start`. */
export function periodEnd(start: ISODate, period: BudgetPeriod): ISODate {
  const d = toDate(start);
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (period) {
    case 'daily':
      return start;
    case 'weekly':
      return addDays(start, 6);
    case 'biweekly':
      return toISO(new Date(y, m, d.getDate() === 1 ? 15 : lastDayOfMonth(y, m)));
    case 'monthly':
      return toISO(new Date(y, m, lastDayOfMonth(y, m)));
    case 'yearly':
      return toISO(new Date(y, 11, 31));
  }
}

/** `period_start` del período inmediatamente siguiente a `start`. */
export function nextPeriodStart(start: ISODate, period: BudgetPeriod): ISODate {
  return addDays(periodEnd(start, period), 1);
}

/** `period_start` del período inmediatamente anterior a `start`. */
export function previousPeriodStart(start: ISODate, period: BudgetPeriod): ISODate {
  return periodStart(addDays(start, -1), period);
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Etiqueta corta en español, p. ej. "1-15 ago 2026", "Semana del 10 ago",
 * "Agosto 2026" -- mismo criterio que `apps.common.periods.label`. */
export function periodLabel(start: ISODate, period: BudgetPeriod): string {
  const d = toDate(start);
  const m = MONTHS_SHORT[d.getMonth()];
  switch (period) {
    case 'daily':
      return `${d.getDate()} ${m} ${d.getFullYear()}`;
    case 'weekly': {
      const end = toDate(periodEnd(start, period));
      const suffix = end.getMonth() === d.getMonth() ? `-${end.getDate()}` : '';
      return `Semana del ${d.getDate()} ${m}${suffix}`;
    }
    case 'biweekly': {
      const end = toDate(periodEnd(start, period));
      return `${d.getDate()}-${end.getDate()} ${m} ${d.getFullYear()}`;
    }
    case 'monthly': {
      const full = MONTHS_FULL[d.getMonth()];
      return `${full.charAt(0).toUpperCase()}${full.slice(1)} ${d.getFullYear()}`;
    }
    case 'yearly':
      return String(d.getFullYear());
  }
}

export const BUDGET_PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];
