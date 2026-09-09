import type { Transaction, TransactionType } from '@/api/types';
import { balanceAfterEach, groupByDay, signedAmount, summarizeByType } from '../transactions';

const txn = (
  id: string,
  type: TransactionType,
  amount: string,
  date = '2026-08-01',
  toWallet: string | null = null,
): Transaction =>
  ({
    id,
    type,
    wallet: 'a',
    to_wallet: type === 'transfer' ? toWallet : null,
    category: type === 'transfer' ? null : 'c',
    amount,
    currency: 'USD',
    description: '',
    date,
    counts_toward_budget: true,
    source: 'manual',
    is_recurring: false,
    created_by: null,
    created_at: '',
    updated_at: '',
  }) as Transaction;

describe('summarizeByType', () => {
  it('separa ingresos y gastos por txn.type y calcula el neto', () => {
    const totals = summarizeByType([
      txn('1', 'income', '3200.00'),
      txn('2', 'expense', '46.30'),
      txn('3', 'expense', '12.00'),
    ]);
    expect(totals.income).toBeCloseTo(3200);
    expect(totals.expenses).toBeCloseTo(58.3);
    expect(totals.net).toBeCloseTo(3141.7);
  });

  it('ignora las transferencias', () => {
    const totals = summarizeByType([
      txn('1', 'expense', '10.00'),
      txn('2', 'transfer', '500.00'),
    ]);
    expect(totals.expenses).toBe(10);
    expect(totals.income).toBe(0);
  });

  it('lista vacía => todo en cero', () => {
    expect(summarizeByType([])).toEqual({ income: 0, expenses: 0, net: 0 });
  });
});

describe('groupByDay', () => {
  it('agrupa por fecha preservando el orden', () => {
    const sections = groupByDay([
      txn('1', 'expense', '1', '2026-08-31'),
      txn('2', 'expense', '2', '2026-08-31'),
      txn('3', 'expense', '3', '2026-08-30'),
    ]);
    expect(sections.map((s) => s.date)).toEqual(['2026-08-31', '2026-08-30']);
    expect(sections[0].data).toHaveLength(2);
    expect(sections[1].data).toHaveLength(1);
  });
});

describe('signedAmount', () => {
  it('ingreso suma, gasto resta', () => {
    expect(signedAmount(txn('1', 'income', '50.00'))).toBe(50);
    expect(signedAmount(txn('1', 'expense', '50.00'))).toBe(-50);
  });

  it('transferencia resta salvo que se mire desde la cartera destino', () => {
    const t = txn('1', 'transfer', '50.00', '2026-08-01', 'b');
    expect(signedAmount(t, 'a')).toBe(-50);
    expect(signedAmount(t, 'b')).toBe(50);
  });
});

describe('balanceAfterEach', () => {
  it('camina hacia atrás desde el saldo actual (más reciente primero)', () => {
    // Orden como lo entrega el API: más reciente primero.
    const items = [
      txn('3', 'expense', '20.00'),
      txn('2', 'income', '100.00'),
      txn('1', 'expense', '10.00'),
    ];
    // Saldo actual = -10 (t1) + 100 (t2) - 20 (t3) = 70.
    const balances = balanceAfterEach(items, 70, 'a');
    expect(balances.get('3')).toBe(70);
    expect(balances.get('2')).toBe(90);
    expect(balances.get('1')).toBe(-10);
  });

  it('respeta la perspectiva en una transferencia entrante', () => {
    const items = [txn('1', 'transfer', '30.00', '2026-08-01', 'b')];
    expect(balanceAfterEach(items, 30, 'b').get('1')).toBe(30);
    expect(balanceAfterEach(items, -30, 'a').get('1')).toBe(-30);
  });

  it('lista vacía => mapa vacío', () => {
    expect(balanceAfterEach([], 100, 'a').size).toBe(0);
  });
});
