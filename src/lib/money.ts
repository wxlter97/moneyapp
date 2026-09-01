import type { Money } from '@/api/types';

/** Convierte un Money ("1234.56") a número. Devuelve 0 si no es parseable. */
export function toNumber(value: Money | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Suma una lista de Money y devuelve número. */
export function sum(values: (Money | null | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + toNumber(v), 0);
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, f);
  }
  return f;
}

/** Formatea un Money o número como moneda. `USD` por defecto. */
export function formatMoney(
  value: Money | number | null | undefined,
  currency = 'USD',
): string {
  const n = typeof value === 'number' ? value : toNumber(value);
  try {
    return formatterFor(currency).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

/** Formato con signo explícito (para deltas: +/-). */
export function formatSigned(value: number, currency = 'USD'): string {
  const s = formatMoney(Math.abs(value), currency);
  if (value > 0) return `+${s}`;
  if (value < 0) return `-${s}`;
  return s;
}
