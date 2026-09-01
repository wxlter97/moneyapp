import { formatMoney, formatSigned, sum, toNumber } from '../money';

describe('toNumber', () => {
  it('parsea strings decimales del API', () => {
    expect(toNumber('1234.56')).toBe(1234.56);
    expect(toNumber('-320.00')).toBe(-320);
  });
  it('devuelve 0 para valores no parseables o nulos', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('abc')).toBe(0);
  });
});

describe('sum', () => {
  it('suma Money mezclando nulos', () => {
    expect(sum(['10.00', '5.50', null, '0.25'])).toBeCloseTo(15.75);
  });
});

describe('formatMoney', () => {
  it('formatea con símbolo de moneda y 2 decimales', () => {
    const out = formatMoney('1234.5', 'USD');
    expect(out).toContain('1,234.50');
  });
  it('cae a un formato simple con monedas inválidas', () => {
    expect(formatMoney(10, 'XXInvalid')).toBe('10.00 XXInvalid');
  });
});

describe('formatSigned', () => {
  it('antepone + / - según el signo', () => {
    expect(formatSigned(50, 'USD')).toMatch(/^\+/);
    expect(formatSigned(-50, 'USD')).toMatch(/^-/);
    expect(formatSigned(0, 'USD')).not.toMatch(/^[+-]/);
  });
});
