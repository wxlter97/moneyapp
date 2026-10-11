import type { TransactionBreakdown } from '@/api/types';
import { buildSpendingSlices } from '../spendingSlices';

const row = (category: string | null, expenses: string, currency = 'USD', count = 1) => ({
  category,
  currency,
  income: '0.00',
  expenses,
  count,
});

describe('buildSpendingSlices', () => {
  it('ordena de mayor a menor y calcula el peso', () => {
    const b: TransactionBreakdown = {
      count: 3,
      categories: [row('a', '25.00'), row('b', '75.00'), row('c', '0.00')],
    };
    const { total, slices } = buildSpendingSlices(b, 'USD');
    expect(total).toBe(100);
    expect(slices.map((s) => s.id)).toEqual(['b', 'a']);
    expect(slices[0].share).toBeCloseTo(0.75);
  });

  it('ignora otras monedas', () => {
    const b: TransactionBreakdown = { count: 2, categories: [row('a', '10.00'), row('b', '99.00', 'EUR')] };
    expect(buildSpendingSlices(b, 'USD').slices.map((s) => s.id)).toEqual(['a']);
  });

  it('agrupa el resto en Otras', () => {
    const cats = Array.from({ length: 9 }, (_, i) => row(`c${i}`, String(100 - i)));
    const { slices, total } = buildSpendingSlices({ count: 9, categories: cats }, 'USD', 6);
    expect(slices).toHaveLength(7);
    expect(slices[6].id).toBe('others');
    expect(slices.reduce((s, x) => s + x.amount, 0)).toBeCloseTo(total);
  });

  it('no crea Otras para una sola categoría sobrante', () => {
    const cats = Array.from({ length: 7 }, (_, i) => row(`c${i}`, String(100 - i)));
    expect(buildSpendingSlices({ count: 7, categories: cats }, 'USD', 6).slices).toHaveLength(7);
  });

  it('sin gastos devuelve vacío', () => {
    expect(buildSpendingSlices(undefined, 'USD')).toEqual({ total: 0, slices: [] });
  });
});
