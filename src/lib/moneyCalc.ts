/**
 * Enlaces a `money-calc` (github.com/wxlter97/money-calc): sitio estático
 * aparte con calculadoras financieras (préstamo, ahorro, interés
 * compuesto...), deployado en GitHub Pages. Sin API ni auth -- "integrarlo"
 * acá es sólo abrir la URL correcta (`Linking.openURL`, mismo patrón que el
 * link del portfolio en `about.tsx`).
 *
 * El slug tiene que existir en `src/registry.js` de ese repo -- no hay
 * forma de validarlo desde acá, así que si se agrega/renombra una
 * calculadora del otro lado, estos slugs quedan obsoletos en silencio
 * (link roto, no un crash) hasta que se actualicen a mano.
 */
export const MONEY_CALC_URL = 'https://wxlter97.github.io/money-calc/';

export type MoneyCalcSlug =
  | 'salario'
  | 'horas-extra'
  | 'interes-compuesto'
  | 'prestamo'
  | 'hipoteca'
  | 'pago-tarjeta'
  | 'roi'
  | 'inflacion'
  | 'jubilacion'
  | 'ahorro-mensual'
  | 'fondo-emergencia'
  | 'precio-maximo-compra';

/** URL a una calculadora puntual (enrutado por hash del lado de money-calc),
 * o al hub si se omite el slug. */
export function moneyCalcUrl(slug?: MoneyCalcSlug): string {
  return slug ? `${MONEY_CALC_URL}#/${slug}` : MONEY_CALC_URL;
}
