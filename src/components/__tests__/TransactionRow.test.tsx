import { render, screen } from '@testing-library/react-native';

import type { Category, Transaction, Wallet } from '@/api/types';
import { TransactionRow } from '@/components/TransactionRow';
import { formatMoney, formatParens } from '@/lib/money';

const wallet = (id: string, name: string): Wallet =>
  ({ id, name, currency: 'USD' }) as Wallet;

const category = (id: string, name: string): Category =>
  ({ id, name, icon: '', color: '' }) as Category;

const baseTxn: Transaction = {
  id: 't1',
  type: 'expense',
  wallet: 'a',
  to_wallet: null,
  category: 'c1',
  amount: '45.50',
  currency: 'USD',
  description: '',
  date: '2026-08-01',
  has_receipt: false,
  counts_toward_budget: true,
  source: 'manual',
  is_recurring: false,
  split_group: null,
  tags: [],
  loyalty_earnings: [],
  created_by: null,
  created_at: '',
  updated_at: '',
} as unknown as Transaction;

const cuenta = wallet('a', 'Cuenta principal');
const ahorro = wallet('b', 'Ahorro');
const super_ = category('c1', 'Supermercado');

describe('TransactionRow', () => {
  it('gasto: título es la categoría, monto entre paréntesis (negativo)', async () => {
    await render(<TransactionRow txn={baseTxn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText(formatParens(-45.5, 'USD'))).toBeTruthy();
  });

  it('usa la descripción como título cuando la hay (no la categoría)', async () => {
    const txn = { ...baseTxn, description: 'Compra de la semana' };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('Compra de la semana')).toBeTruthy();
  });

  it('ingreso: monto sin paréntesis (positivo)', async () => {
    const sueldo = category('c2', 'Sueldo');
    const txn = { ...baseTxn, type: 'income' as const, amount: '1200.00' };
    await render(<TransactionRow txn={txn} category={sueldo} wallet={cuenta} />);
    expect(screen.getByText(formatParens(1200, 'USD'))).toBeTruthy();
  });

  it('transferencia: título fijo + "origen → destino", sin signo propio', async () => {
    const txn = {
      ...baseTxn, type: 'transfer' as const, to_wallet: 'b', category: null, amount: '200.00',
    };
    await render(<TransactionRow txn={txn} wallet={cuenta} toWallet={ahorro} />);
    expect(screen.getByText('Transferencia')).toBeTruthy();
    expect(screen.getByText('Cuenta principal → Ahorro')).toBeTruthy();
  });

  it('transferencia vista desde el origen: sale (negativo)', async () => {
    const txn = {
      ...baseTxn, type: 'transfer' as const, to_wallet: 'b', category: null, amount: '200.00',
    };
    await render(
      <TransactionRow txn={txn} wallet={cuenta} toWallet={ahorro} perspectiveWalletId="a" />,
    );
    expect(screen.getByText(formatParens(-200, 'USD'))).toBeTruthy();
  });

  it('transferencia vista desde el destino: entra (positivo)', async () => {
    const txn = {
      ...baseTxn, type: 'transfer' as const, to_wallet: 'b', category: null, amount: '200.00',
    };
    await render(
      <TransactionRow txn={txn} wallet={cuenta} toWallet={ahorro} perspectiveWalletId="b" />,
    );
    expect(screen.getByText(formatParens(200, 'USD'))).toBeTruthy();
  });

  it('muestra el saldo después, sólo cuando se lo pasan', async () => {
    const { rerender } = await render(<TransactionRow txn={baseTxn} category={super_} wallet={cuenta} />);
    expect(screen.queryByText(/^Saldo:/)).toBeNull();

    await rerender(
      <TransactionRow txn={baseTxn} category={super_} wallet={cuenta} balanceAfter={954.5} />,
    );
    expect(screen.getByText(`Saldo: ${formatMoney(954.5, 'USD')}`)).toBeTruthy();
  });

  it('gasto fuera de presupuesto muestra el badge "s/pres."', async () => {
    const txn = { ...baseTxn, counts_toward_budget: false };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('s/pres.')).toBeTruthy();
  });

  it('una transacción importada por correo muestra el badge "correo"', async () => {
    const txn = { ...baseTxn, source: 'email_import' as const };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('correo')).toBeTruthy();
  });

  it('una transacción manual no muestra ningún badge de origen', async () => {
    await render(<TransactionRow txn={baseTxn} category={super_} wallet={cuenta} />);
    expect(screen.queryByText('correo')).toBeNull();
    expect(screen.queryByText('cuota')).toBeNull();
    expect(screen.queryByText('atajo')).toBeNull();
  });
});
