import type { Transaction, TransactionType } from '@/api/types';
import { groupByDay, summarizeByType } from '../transactions';

const txn = (
  id: string,
  type: TransactionType,
  amount: string,
  date = '2026-08-01',
): Transaction =>
  ({
    id,
    type,
    account: 'a',
    to_account: null,
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
