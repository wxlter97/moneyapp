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

/**
 * Importe con el signo desde la perspectiva del saldo de `perspectiveWalletId`:
 * ingreso suma, gasto resta. Una transferencia resta (sale) salvo que se esté
 * mirando desde la cartera que la recibe, en cuyo caso suma.
 */
export function signedAmount(txn: Transaction, perspectiveWalletId?: string): number {
  const amount = toNumber(txn.amount);
  const isIncomingTransfer = txn.type === 'transfer' && perspectiveWalletId === txn.to_wallet;
  return txn.type === 'income' || isIncomingTransfer ? amount : -amount;
}

/**
 * Saldo de `perspectiveWalletId` inmediatamente después de cada movimiento
 * de su historial, para mostrarlo en la lista. `transactions` tiene que
 * venir completo (sin paginar) y en el orden que ya entrega el API (más
 * reciente primero) -- si falta algún movimiento entre medio, el resto de la
 * columna queda mal. Se camina hacia atrás desde `currentBalance` (el saldo
 * de HOY) restando el efecto de cada fila, así cada una queda con el saldo
 * de justo después de aplicarse.
 */
export function balanceAfterEach(
  transactions: Transaction[],
  currentBalance: number,
  perspectiveWalletId: string,
): Map<string, number> {
  const result = new Map<string, number>();
  let running = currentBalance;
  for (const t of transactions) {
    result.set(t.id, running);
    running -= signedAmount(t, perspectiveWalletId);
  }
  return result;
}
