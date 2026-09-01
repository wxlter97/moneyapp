import type { ISODate, Transaction } from '@/api/types';
import { toNumber } from './money';

export interface TypeTotals {
  income: number;
  expenses: number;
  net: number;
}

/**
 * Suma ingresos y gastos de una lista de transacciones usando `txn.type`.
 * Las transferencias no cuentan ni como ingreso ni como gasto.
 */
export function summarizeByType(transactions: Transaction[]): TypeTotals {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    const amount = toNumber(t.amount);
    if (t.type === 'income') income += amount;
    else if (t.type === 'expense') expenses += amount;
  }
  return { income, expenses, net: income - expenses };
}

export interface DaySection {
  date: ISODate;
  data: Transaction[];
}

/**
 * Agrupa transacciones por día (`date`), manteniendo el orden de entrada
 * (el API ya las devuelve de más reciente a más antigua).
 */
export function groupByDay(transactions: Transaction[]): DaySection[] {
  const sections: DaySection[] = [];
  const index = new Map<string, DaySection>();
  for (const t of transactions) {
    let section = index.get(t.date);
    if (!section) {
      section = { date: t.date, data: [] };
      index.set(t.date, section);
      sections.push(section);
    }
    section.data.push(t);
  }
  return sections;
}
