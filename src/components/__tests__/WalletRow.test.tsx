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
