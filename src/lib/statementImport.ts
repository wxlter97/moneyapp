import type { StatementCandidate } from '@/api/types';
import { toNumber } from '@/lib/money';

/** Cuenta del estado de cuenta -> saldo inicial de la cartera nueva, de modo
 * que DESPUÉS de importar los movimientos elegidos el saldo coincida con el
 * del estado (si no, los movimientos se sumarían encima del saldo al corte). */
export function openingBalanceFor(
  wallet: StatementCandidate['wallet'],
  selected: { type: 'income' | 'expense'; amount: string }[],
): number {
  if (wallet.closing_balance == null) return 0;
  const closing = toNumber(wallet.closing_balance);
  const net = selected.reduce(
    (n, t) => n + (t.type === 'income' ? toNumber(t.amount) : -toNumber(t.amount)),
    0,
  );
  const finalBalance = wallet.purpose === 'debt' ? -closing : closing;
  return Math.round((finalBalance - net) * 100) / 100;
}
