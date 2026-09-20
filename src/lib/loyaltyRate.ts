import type { ISODate } from '@/api/types';

/** Día de la semana de una fecha ISO ("2026-09-21") con lunes = 0 … domingo = 6:
 * los mismos números que `date.weekday()` en el backend (`LoyaltyCategoryRate.weekday`).
 * Se arma con componentes locales: `new Date("2026-09-21")` se interpreta en UTC
 * y en zonas al oeste de Greenwich caería en el día anterior. */
export function weekdayMon0(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

interface RateRow {
  category_type: string;
  rate: string;
  weekday: number | null;
}

/**
 * Tasa efectiva de un programa para un rubro y una fecha: la misma regla que
 * `LoyaltyProgram.rate_for` del backend (gana la más específica): rubro + día,
 * luego rubro sin día, y si no hay ninguna la tasa base del programa. Esto es
 * sólo la vista previa antes de guardar; lo que vale es lo que calcula el servidor.
 */
export function pickRate(
  program: { default_rate: string; category_rates: RateRow[] },
  categoryType: string | null | undefined,
  date: ISODate,
): string {
  if (categoryType) {
    const rows = program.category_rates.filter((r) => r.category_type === categoryType);
    const day = weekdayMon0(date);
    const exact = rows.find((r) => r.weekday === day);
    if (exact) return exact.rate;
    const anyDay = rows.find((r) => r.weekday == null);
    if (anyDay) return anyDay.rate;
  }
  return program.default_rate;
}
