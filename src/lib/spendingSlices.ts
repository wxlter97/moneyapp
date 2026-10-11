import type { TransactionBreakdown } from '@/api/types';
import { toNumber } from '@/lib/money';

export interface SpendingSlice {
  /** null = «Sin categoría»; 'others' = lo que no entra en el top. */
  id: string | null | 'others';
  amount: number;
  /** 0..1 sobre el total gastado. */
  share: number;
  count: number;
}

export interface SpendingSlices {
  total: number;
  slices: SpendingSlice[];
}

/**
 * Gastos por categoría de un `TransactionBreakdown` (sólo la moneda base, para
 * no mezclar montos): las `top` mayores y el resto agrupado en «Otras».
 */
export function buildSpendingSlices(
  breakdown: TransactionBreakdown | undefined,
  currency: string,
  top = 6,
): SpendingSlices {
  const rows = (breakdown?.categories ?? [])
    .filter((r) => r.currency === currency && toNumber(r.expenses) > 0)
    .map((r) => ({ id: r.category, amount: toNumber(r.expenses), count: r.count }))
    .sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (total <= 0) return { total: 0, slices: [] };

  // Si «Otras» sería una sola categoría, se muestra ella misma.
  const head = rows.length > top + 1 ? rows.slice(0, top) : rows;
  const rest = rows.slice(head.length);
  const slices: SpendingSlice[] = head.map((r) => ({ ...r, share: r.amount / total }));
  if (rest.length > 0) {
    const amount = rest.reduce((s, r) => s + r.amount, 0);
    slices.push({
      id: 'others',
      amount,
      share: amount / total,
      count: rest.reduce((s, r) => s + r.count, 0),
    });
  }
  return { total, slices };
}
