import { MONEY_CALC_URL, moneyCalcUrl } from '../moneyCalc';

describe('moneyCalcUrl', () => {
  it('sin slug: el hub', () => {
    expect(moneyCalcUrl()).toBe(MONEY_CALC_URL);
  });

  it('con slug: hash-route a esa calculadora', () => {
    expect(moneyCalcUrl('prestamo')).toBe(`${MONEY_CALC_URL}#/prestamo`);
    expect(moneyCalcUrl('ahorro-mensual')).toBe(`${MONEY_CALC_URL}#/ahorro-mensual`);
  });
});
