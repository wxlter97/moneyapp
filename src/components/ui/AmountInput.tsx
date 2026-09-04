import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

interface AmountInputProps {
  label: string;
  /** Monto como string decimal ("25.50"). */
  value: string;
  onChangeText: (value: string) => void;
  currency?: string;
  error?: string;
  autoFocus?: boolean;
}

const MAX_CENTS = 99_999_999_99; // ~1e9

function toCents(value: string): number {
  const n = Math.round(Number(value.replace(',', '.')) * 100);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_CENTS) : 0;
}

const grouped = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Entrada de monto estilo cajero: los dígitos se acumulan desde los centavos.
 * Teclear 123456 pasa por 0.01 → 0.12 → 1.23 → 12.34 → 123.45 → 1234.56.
 * Borrar quita el último dígito.
 */
export function AmountInput({
  label,
  value,
  onChangeText,
  currency = 'USD',
  error,
  autoFocus = false,
}: AmountInputProps) {
  const cents = useMemo(() => toCents(value), [value]);
  const display = grouped.format(cents / 100);
  const [focused, setFocused] = useState(false);

  function handleChange(text: string) {
    // Reinterpreta TODOS los dígitos del campo como centavos: robusto ante
    // dónde ponga el cursor el usuario.
    const digits = text.replace(/\D/g, '').slice(0, 11);
    const nextCents = digits ? parseInt(digits, 10) : 0;
    onChangeText((nextCents / 100).toFixed(2));
  }

  return (
    <View className="gap-1.5">
      <Text className="text-text-muted text-sm">{label}</Text>
      <View
        className={`h-14 flex-row items-center rounded-xl border bg-surface px-3 ${
          error ? 'border-expense' : focused ? 'border-primary' : 'border-border'
        }`}
      >
        <Text className="text-text-muted mr-1 text-lg">{currency}</Text>
        <TextInput
          value={display}
          onChangeText={handleChange}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          selectTextOnFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-text text-2xl font-semibold"
          accessibilityLabel={label}
        />
      </View>
      {error ? <Text className="text-expense text-xs">{error}</Text> : null}
    </View>
  );
}
