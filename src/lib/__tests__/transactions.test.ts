import type { Transaction } from '@/api/types';
import { summarizeByType } from '../transactions';

const txn = (id: string, category: string, amount: string): Transaction =>
  ({
    id,
    account: 'a',
    category,
    amount,
    currency: 'USD',
    description: '',
    date: '2026-08-01',
    source: 'manual',
    is_recurring: false,
    created_by: null,
    created_at: '',
    updated_at: '',
  }) as Transaction;

describe('summarizeByType', () => {
  const categories = new Map([
    ['sueldo', { type: 'income' as const }],
    ['comida', { type: 'expense' as const }],
  ]);

  it('separa ingresos y gastos por category.type y calcula el neto', () => {
    const totals = summarizeByType(
      [txn('1', 'sueldo', '3200.00'), txn('2', 'comida', '46.30'), txn('3', 'comida', '12.00')],
      categories,
    );
    expect(totals.income).toBeCloseTo(3200);
    expect(totals.expenses).toBeCloseTo(58.3);
    expect(totals.net).toBeCloseTo(3141.7);
  });

  it('cuenta como gasto las transacciones con categoría no resuelta', () => {
    const totals = summarizeByType([txn('1', 'desconocida', '100.00')], categories);
    expect(totals.expenses).toBe(100);
    expect(totals.income).toBe(0);
  });

  it('lista vacía => todo en cero', () => {
    expect(summarizeByType([], categories)).toEqual({ income: 0, expenses: 0, net: 0 });
  });
});
