import type { LoyaltyProgramBalance, LoyaltyWalletBalance } from '@/api/types';
import { formatMoney, toNumber } from '@/lib/money';

/** Cantidad en la unidad del programa: "12,400 pts" para puntos, "$20.00" para cashback. */
export function formatQuantity(
  unit: LoyaltyProgramBalance['unit'],
  value: string | number | null | undefined,
  currency = 'USD',
): string {
  const n = typeof value === 'number' ? value : toNumber(value);
  return unit === 'currency' ? formatMoney(n, currency) : `${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })} pts`;
}

/** Valor en dinero de una cantidad de puntos a un valor de canje; `null` si no hay valor. */
export function pointsToCash(points: number, pointValue: string | number | null | undefined): number | null {
  if (pointValue == null || pointValue === '') return null;
  return Math.round(points * Number(pointValue) * 100) / 100;
}

/** Tarjetas agrupadas por banco (en el orden en que llegan), cada grupo con su subtotal
 * en dinero: la pantalla no mezcla bancos en una sola lista. */
export interface BankGroup {
  bank: string;
  bankName: string;
  wallets: LoyaltyWalletBalance[];
}

export function groupByBank(wallets: LoyaltyWalletBalance[]): BankGroup[] {
  const groups = new Map<string, BankGroup>();
  for (const wallet of wallets) {
    const group = groups.get(wallet.bank) ?? { bank: wallet.bank, bankName: wallet.bank_name, wallets: [] };
    group.wallets.push(wallet);
    groups.set(wallet.bank, group);
  }
  return [...groups.values()];
}

/** Suma del valor en dinero de lo disponible, **por moneda** (no se mezclan monedas). */
export function totalsByCurrency(wallets: LoyaltyWalletBalance[]): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const wallet of wallets) {
    totals.set(wallet.currency, (totals.get(wallet.currency) ?? 0) + toNumber(wallet.total_value));
  }
  return [...totals.entries()].map(([currency, total]) => ({ currency, total }));
}

/** Los puntos que hay disponibles pero sin valor de canje (no entran en el total en dinero):
 * sirve para avisar que el total no los incluye. */
export function pointsWithoutValue(wallets: LoyaltyWalletBalance[]): number {
  let count = 0;
  for (const wallet of wallets) {
    for (const p of wallet.programs) {
      if (p.unit === 'points' && p.estimated_value == null && toNumber(p.available) > 0) count += 1;
    }
  }
  return count;
}

/** Cuánto habría que ajustar (con signo) para que el disponible sea `target`. */
export function adjustmentToReach(available: string | number, target: number): number {
  const current = typeof available === 'number' ? available : toNumber(available);
  return Math.round((target - current) * 100) / 100;
}

/** Lo que se escribe en un campo de cantidad ("1,250.5", "12,5", " 3 ") como número; `NaN`
 * si está vacío o no es un número. Acepta coma o punto decimal, y separadores de miles con
 * coma cuando también hay punto. */
export function parseQuantity(text: string): number {
  const t = text.trim();
  if (!t) return NaN;
  // "1,250.50" -> miles con coma; "12,5" -> decimal con coma.
  const normalized = t.includes('.') ? t.replace(/,/g, '') : t.replace(',', '.');
  return /^-?\d*\.?\d+$|^-?\d+\.$/.test(normalized) ? Number(normalized) : NaN;
}
