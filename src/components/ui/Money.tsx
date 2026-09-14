import { Text, type TextProps } from 'react-native';

import type { Money as MoneyValue } from '@/api/types';
import { formatMoney, formatParens, formatSigned, toNumber } from '@/lib/money';
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
  className?: string;
}

export function Money({
  value,
  currency = 'USD',
  signed = false,
  parens = false,
  tone = 'default',
  hero = false,
  className = '',
  style,
  ...rest
}: MoneyProps) {
  const n = typeof value === 'number' ? value : toNumber(value);
  const text = parens
    ? formatParens(n, currency)
    : signed
      ? formatSigned(n, currency)
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
      {...rest}
    >
      {text}
    </Text>
  );
}
