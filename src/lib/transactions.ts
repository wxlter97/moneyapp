import { useRef, useState } from 'react';

import { useDeleteTransaction } from '@/api/queries';
import type { ISODate, Transaction } from '@/api/types';
import { useSnackbarStore } from '@/store/snackbar';
import { haptics } from './haptics';
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

export interface CategoryBreakdownRow {
  category: string | null;
  income: number;
  expenses: number;
  count: number;
}

/** Ingresos/gastos por categoría (sólo `currency`; sin transferencias), de
 * mayor a menor -- la misma forma que `transactions/breakdown/` del servidor,
 * para la lista del mes, que ya está entera en el cliente. */
export function breakdownByCategory(
  transactions: Transaction[],
  currency: string,
): CategoryBreakdownRow[] {
  const rows = new Map<string | null, CategoryBreakdownRow>();
  for (const t of transactions) {
    if (t.currency !== currency || (t.type !== 'income' && t.type !== 'expense')) continue;
    let row = rows.get(t.category);
    if (!row) {
      row = { category: t.category, income: 0, expenses: 0, count: 0 };
      rows.set(t.category, row);
    }
    if (t.type === 'income') row.income += toNumber(t.amount);
    else row.expenses += toNumber(t.amount);
    row.count += 1;
  }
  return [...rows.values()].sort((a, b) => b.income + b.expenses - (a.income + a.expenses));
}

/**
 * Totales de la moneda base a partir de los que calculó el servidor (todo lo
 * que cumple el filtro, no sólo lo cargado), restando las filas que se acaban
 * de deslizar-borrar y siguen esperando su «Deshacer» -- así el total baja al
 * instante, igual que la lista.
 */
export function totalsForCurrency(
  server: { currency: string; income: string; expenses: string }[] | undefined,
  currency: string,
  pending: Transaction[] = [],
): TypeTotals {
  const row = server?.find((r) => r.currency === currency);
  const gone = summarizeByType(pending.filter((t) => t.currency === currency));
  const income = Math.max(0, toNumber(row?.income) - gone.income);
  const expenses = Math.max(0, toNumber(row?.expenses) - gone.expenses);
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

/**
 * Borrado optimista con "Deshacer" para deslizar una `TransactionRow`: la
 * fila desaparece al instante (`pendingDeleteIds`, para filtrar la lista que
 * se muestra) y se dispara un snackbar de unos segundos -- el DELETE real
 * sólo se manda si nadie lo deshace a tiempo (`onTimeout`).
 *
 * El snackbar es global y de un solo mensaje a la vez (ver `store/snackbar.ts`):
 * mostrar uno nuevo reemplaza al anterior SIN avisarle. Si se desliza un
 * segundo borrado mientras el primero todavía esperaba su "Deshacer", ese
 * primero se compromete (se borra de verdad) acá en vez de quedar oculto
 * para siempre en la lista sin llegar a borrarse.
 */
export function useSwipeDeleteTransactions() {
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const pendingRef = useRef<string | null>(null);
  const deleteTxn = useDeleteTransaction();
  const showSnackbar = useSnackbarStore((s) => s.show);

  function clear(id: string) {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function commit(id: string) {
    if (pendingRef.current === id) pendingRef.current = null;
    try {
      await deleteTxn.mutateAsync(id);
    } catch {
      haptics.error();
      clear(id);
    }
  }

  function onSwipeDelete(id: string) {
    if (pendingRef.current && pendingRef.current !== id) commit(pendingRef.current);

    pendingRef.current = id;
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    showSnackbar({
      message: 'Movimiento eliminado.',
      actionLabel: 'Deshacer',
      onAction: () => {
        if (pendingRef.current === id) pendingRef.current = null;
        haptics.selection();
        clear(id);
      },
      onTimeout: () => commit(id),
    });
  }

  return { pendingDeleteIds, onSwipeDelete };
}
