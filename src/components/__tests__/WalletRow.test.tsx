import type { Wallet } from '@/api/types';
import { walletRowLabel } from '@/components/WalletRow';
import { formatMoney } from '@/lib/money';

const base: Wallet = {
  id: 'w1',
  name: 'Efectivo',
  currency: 'USD',
  current_balance: '120.50',
  aggregated_balance: '500.00',
  is_active: true,
  visibility: 'shared',
} as Wallet;

// Regresión de la auditoría de accesibilidad (mismo hallazgo que
// TransactionRow/WorkspaceSwitcher): el `Pressable` que envuelve la fila en
// `(tabs)/wallets.tsx` tenía `accessibilityRole="button"` sin
// `accessibilityLabel` -- un lector de pantalla la anunciaba como un botón
// sin texto.
describe('walletRowLabel', () => {
  it('incluye nombre y saldo (no el agregado, sin hijos)', () => {
    expect(walletRowLabel(base)).toBe(`Efectivo, ${formatMoney(120.5, 'USD')}`);
  });

  it('usa el saldo agregado cuando `hasChildren` es true', () => {
    expect(walletRowLabel(base, true)).toBe(`Efectivo, ${formatMoney(500, 'USD')}`);
  });

  it('agrega "privada" e "inactiva" cuando aplican', () => {
    const wallet = { ...base, visibility: 'private' as const, is_active: false };
    expect(walletRowLabel(wallet)).toBe(
      `Efectivo, ${formatMoney(120.5, 'USD')}, privada, inactiva`,
    );
  });
});

describe('walletRowLabel con pago de tarjeta', () => {
  it('agrega qué pagar y hasta cuándo', () => {
    const card = { ...base, name: 'Visa', current_balance: '-330.00' } as Wallet;
    const label = walletRowLabel(card, false, {
      phase: 'due',
      status: 'pending',
      amount: '200.00',
      statement_balance: '250.00',
      minimum_remaining: null,
      cutoff_date: '2026-10-03',
      due_date: '2026-10-20',
      days_left: 4,
      next_cutoff_date: '2026-11-03',
      next_statement_so_far: '80.00',
      payoff_today: '280.00',
    });
    expect(label).toBe(
      `Visa, ${formatMoney(-330, 'USD')}, Pagar antes del 20 oct: ${formatMoney(200, 'USD')}`,
    );
  });
});
