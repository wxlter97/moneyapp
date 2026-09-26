import { Text, type TextProps } from 'react-native';

import type { Money as MoneyValue } from '@/api/types';
import { formatMoney, formatNumber, formatParens, formatSigned, toNumber } from '@/lib/money';
import { useCountingNumber } from '@/lib/useCountingNumber';
import { black, mono } from '@/theme/typography';

interface MoneyProps extends TextProps {
  value: MoneyValue | number | null | undefined;
  currency?: string;
  /** Colorea según signo (verde/rojo) y muestra +/-. */
  signed?: boolean;
  /** Estilo Buddy: negativos entre paréntesis "($15.99)". */
  parens?: boolean;
  /** Fuerza un color semántico independientemente del signo. */
  tone?: 'income' | 'expense' | 'warning' | 'default' | 'muted';
  /** Cifra protagonista (patrimonio neto, restante del período…): Archivo
   * Black + tracking negativo, en vez de JetBrains Mono como el resto de
   * `Money` -- ver `theme/typography.ts`. */
  hero?: boolean;
  /** El número cuenta hasta el valor nuevo en vez de saltar de golpe --
   * para totales que cambian por una acción explícita (cambiar de mes,
   * cambiar de filtro), no para cifras que se actualizan solas en segundo
   * plano (ahí, contar constantemente distrae más de lo que aclara). Default
   * `false` a propósito: opt-in por pantalla, no un cambio de comportamiento
   * global de `Money`. Respeta "reducir movimiento" (ver `useCountingNumber`). */
  animate?: boolean;
  /** Sin código de moneda ("1,052.40" en vez de "USD 1,052.40") -- para
   * filas y bloques densos donde la moneda ya es la del workspace. El
   * lector de pantalla igual recibe el monto con su moneda. */
  hideCurrency?: boolean;
  className?: string;
}

export function Money({
  value,
  currency = 'USD',
  signed = false,
  parens = false,
  tone = 'default',
  hero = false,
  animate = false,
  hideCurrency = false,
  className = '',
  style,
  ...rest
}: MoneyProps) {
  const rawN = typeof value === 'number' ? value : toNumber(value);
  // `enabled: animate` -- el hook se llama siempre (las reglas de hooks no
  // admiten un `if` acá), pero con `animate=false` no programa ningún
  // `requestAnimationFrame` de fondo: sin esto, cada `Money` sin animar de
  // una lista larga arrastraría su propio loop de animación cada vez que
  // llega un refetch, sin que nadie lo vea.
  const n = useCountingNumber(rawN, undefined, animate);
  const text = parens
    ? formatParens(n, currency, hideCurrency)
    : signed
      ? formatSigned(n, currency, hideCurrency)
      : hideCurrency
        ? formatNumber(n)
        : formatMoney(n, currency);

  let color = 'text-text';
  if (tone === 'muted') color = 'text-text-muted';
  else if (tone === 'income') color = 'text-income';
  else if (tone === 'expense') color = 'text-expense';
  else if (tone === 'warning') color = 'text-warning';
  else if (signed && n > 0) color = 'text-income';
  else if (signed && n < 0) color = 'text-expense';

  // Identidad wxlter.: `Money` es siempre un dato financiero, así que
  // siempre va en JetBrains Mono -- salvo `hero` (la cifra protagonista de
  // una pantalla: patrimonio neto, restante del período…), que es
  // exclusivamente Archivo Black (ver `theme/typography.ts`). RN no
  // sintetiza pesos sobre una fuente custom de forma confiable en iOS:
  // `font-bold`/`font-semibold` de Tailwind (sólo cambian `fontWeight`) no
  // alcanzan para elegir el peso — acá resolvemos al archivo .ttf correcto.
  const fontFamily = hero
    ? black
    : className.includes('font-bold')
      ? mono.semibold
      : className.includes('font-semibold')
        ? mono.medium
        : mono.regular;

  return (
    <Text
      className={`${color} ${className}`}
      style={[fontFamily ? { fontFamily } : null, hero ? { letterSpacing: -1.2 } : null, style]}
      accessibilityLabel={hideCurrency ? formatSigned(rawN, currency) : undefined}
      {...rest}
    >
      {text}
    </Text>
  );
}
