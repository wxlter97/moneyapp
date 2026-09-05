/**
 * Lista curada de monedas para los selectores (cartera, moneda base del
 * workspace). Lista cerrada a propósito: un código ISO 4217 mal tipeado
 * rompe el formato de `Intl.NumberFormat` en `lib/money.ts` y, peor, nunca
 * va a matchear ninguna tasa de cambio cargada.
 */
export interface CurrencyOption {
  code: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'Dólar estadounidense' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'Libra esterlina' },
  { code: 'MXN', label: 'Peso mexicano' },
  { code: 'GTQ', label: 'Quetzal guatemalteco' },
  { code: 'HNL', label: 'Lempira hondureña' },
  { code: 'NIO', label: 'Córdoba nicaragüense' },
  { code: 'CRC', label: 'Colón costarricense' },
  { code: 'PAB', label: 'Balboa panameño' },
  { code: 'DOP', label: 'Peso dominicano' },
  { code: 'COP', label: 'Peso colombiano' },
  { code: 'PEN', label: 'Sol peruano' },
  { code: 'ARS', label: 'Peso argentino' },
  { code: 'CLP', label: 'Peso chileno' },
  { code: 'BRL', label: 'Real brasileño' },
  { code: 'CAD', label: 'Dólar canadiense' },
  { code: 'JPY', label: 'Yen japonés' },
  { code: 'CNY', label: 'Yuan chino' },
];

export function currencyLabel(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.label ?? code;
}
