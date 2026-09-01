import type { Category, Transaction } from '@/api/types';
import { toNumber } from './money';

export interface TypeTotals {
  income: number;
  expenses: number;
  net: number;
}

/**
 * Suma ingresos y gastos de una lista de transacciones. El tipo lo aporta la
 * categoría (`category.type`); las transacciones sin categoría resuelta cuentan
 * como gasto (es lo más conservador para un resumen).
 */
export function summarizeByType(
  transactions: Transaction[],
  categories: Map<string, Pick<Category, 'type'>>,
): TypeTotals {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    const amount = toNumber(t.amount);
    if (categories.get(t.category)?.type === 'income') income += amount;
    else expenses += amount;
  }
  return { income, expenses, net: income - expenses };
}
