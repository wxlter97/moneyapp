import type { LoyaltyProgramBalance, LoyaltyWalletBalance } from '@/api/types';

import {
  adjustmentToReach,
  formatQuantity,
  groupByBank,
  pointsToCash,
  pointsWithoutValue,
  parseQuantity,
  totalsByCurrency,
} from '../rewards';

const program = (over: Partial<LoyaltyProgramBalance> = {}): LoyaltyProgramBalance => ({
  program: 'p', name: 'Puntos', kind: 'points', unit: 'points', is_active: true, earned: '0', adjusted: '0',
  redeemed: '0', available: '0', point_value: null, estimated_value: null, min_amount: null, ...over,
});
const wallet = (over: Partial<LoyaltyWalletBalance>): LoyaltyWalletBalance => ({
  wallet: 'w', wallet_name: 'Visa', currency: 'USD', bank: 'b1', bank_name: 'Banco 1', product_name: 'Oro',
  programs: [], discount_saved: '0', total_value: '0', ...over,
});

describe('formatQuantity', () => {
  it('puntos con "pts" y cashback como dinero', () => {
    expect(formatQuantity('points', '12400')).toBe('12,400 pts');
    expect(formatQuantity('currency', '20', 'USD')).toContain('20.00');
  });
});

describe('pointsToCash', () => {
  it('multiplica y redondea a centavos; sin valor de canje no hay valor', () => {
    expect(pointsToCash(12400, '0.005')).toBe(62);
    expect(pointsToCash(333, '0.005')).toBe(1.67);
    expect(pointsToCash(100, null)).toBeNull();
  });
});

describe('groupByBank', () => {
  it('agrupa por banco sin mezclarlos y conserva el orden', () => {
    const groups = groupByBank([
      wallet({ wallet: 'a', bank: 'b1', bank_name: 'Banco 1' }),
      wallet({ wallet: 'b', bank: 'b2', bank_name: 'Banco 2' }),
      wallet({ wallet: 'c', bank: 'b1', bank_name: 'Banco 1' }),
    ]);
    expect(groups.map((g) => [g.bankName, g.wallets.map((w) => w.wallet)])).toEqual([
      ['Banco 1', ['a', 'c']],
      ['Banco 2', ['b']],
    ]);
  });
});

describe('totalsByCurrency', () => {
  it('suma por moneda, nunca mezclándolas', () => {
    const totals = totalsByCurrency([
      wallet({ total_value: '10.50' }),
      wallet({ total_value: '4.50' }),
      wallet({ total_value: '3', currency: 'EUR' }),
    ]);
    expect(totals).toEqual([
      { currency: 'USD', total: 15 },
      { currency: 'EUR', total: 3 },
    ]);
  });
});

describe('pointsWithoutValue', () => {
  it('cuenta los programas de puntos con saldo que no entran al total en dinero', () => {
    expect(
      pointsWithoutValue([
        wallet({
          programs: [
            program({ available: '100', estimated_value: null }),
            program({ available: '100', estimated_value: '5' }),
            program({ available: '0', estimated_value: null }),
            program({ unit: 'currency', kind: 'cashback', available: '3', estimated_value: '3' }),
          ],
        }),
      ]),
    ).toBe(1);
  });
});

describe('adjustmentToReach', () => {
  it('el ajuste con signo que lleva el disponible a un valor', () => {
    expect(adjustmentToReach('1000', 1250)).toBe(250);
    expect(adjustmentToReach('1000', 900.5)).toBe(-99.5);
    expect(adjustmentToReach('1000', 1000)).toBe(0);
  });
});

describe('parseQuantity', () => {
  it('acepta punto o coma decimal y separador de miles', () => {
    expect(parseQuantity('1250')).toBe(1250);
    expect(parseQuantity('12.5')).toBe(12.5);
    expect(parseQuantity('12,5')).toBe(12.5);
    expect(parseQuantity('1,250.50')).toBe(1250.5);
    expect(parseQuantity(' 3 ')).toBe(3);
    expect(parseQuantity('.5')).toBe(0.5);
  });
  it('lo que no es un número da NaN', () => {
    for (const bad of ['', '  ', 'abc', '1.2.3', '12a', '--1']) {
      expect(parseQuantity(bad)).toBeNaN();
    }
  });
});
