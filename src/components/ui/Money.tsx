import { Text, type TextProps } from 'react-native';

import type { Money as MoneyValue } from '@/api/types';
import { formatMoney, formatSigned, toNumber } from '@/lib/money';

interface MoneyProps extends TextProps {
  value: MoneyValue | number | null | undefined;
  currency?: string;
  /** Colorea según signo (verde/rojo) y muestra +/-. */
  signed?: boolean;
  /** Fuerza un color semántico independientemente del signo. */
  tone?: 'income' | 'expense' | 'default' | 'muted';
  className?: string;
}

export function Money({
  value,
  currency = 'USD',
  signed = false,
  tone = 'default',
  className = '',
  ...rest
}: MoneyProps) {
  const n = typeof value === 'number' ? value : toNumber(value);
  const text = signed ? formatSigned(n, currency) : formatMoney(n, currency);

  let color = 'text-text';
  if (tone === 'muted') color = 'text-text-muted';
  else if (tone === 'income') color = 'text-income';
  else if (tone === 'expense') color = 'text-expense';
  else if (signed && n > 0) color = 'text-income';
  else if (signed && n < 0) color = 'text-expense';

  return (
    <Text className={`${color} ${className}`} {...rest}>
      {text}
    </Text>
  );
}
