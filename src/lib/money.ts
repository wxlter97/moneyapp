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

const numberFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactFormatter = new Intl.NumberFormat('es-MX', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Desde acá, `formatNumber(..., { compact: true })` abrevia ("1.2 M"): una
 * cifra de 9+ dígitos no entra en una celda angosta ni achicando la fuente. */
const COMPACT_FROM = 1_000_000;

/** Sólo el número ("1,052.40"), sin código de moneda -- para bloques densos
 * donde la moneda ya es obvia por contexto (una sola moneda en toda la
 * pantalla). `compact` abrevia desde el millón. */
export function formatNumber(
  value: Money | number | null | undefined,
  { compact = false }: { compact?: boolean } = {},
): string {
  const n = typeof value === 'number' ? value : toNumber(value);
  if (compact && Math.abs(n) >= COMPACT_FROM) return compactFormatter.format(n);
  return numberFormatter.format(n);
}

/** Formato con signo explícito (para deltas: +/-). */
export function formatSigned(value: number, currency = 'USD', bare = false): string {
  const s = bare ? formatNumber(Math.abs(value)) : formatMoney(Math.abs(value), currency);
  if (value > 0) return `+${s}`;
  if (value < 0) return `-${s}`;
  return s;
}

/** Estilo Buddy: negativos entre paréntesis, "($15.99)". */
export function formatParens(
  value: Money | number | null | undefined,
  currency = 'USD',
  bare = false,
): string {
  const n = typeof value === 'number' ? value : toNumber(value);
  const s = bare ? formatNumber(Math.abs(n)) : formatMoney(Math.abs(n), currency);
  return n < 0 ? `(${s})` : s;
}
