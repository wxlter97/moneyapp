import { Pressable, Text, View } from 'react-native';

interface NumPadProps {
  /** Monto como string decimal ("25.50"). */
  value: string;
  onChange: (value: string) => void;
}

const MAX_DIGITS = 11;

const KEYS: { label: string; kind: 'digit' | 'double' | 'back' }[] = [
  { label: '1', kind: 'digit' },
  { label: '2', kind: 'digit' },
  { label: '3', kind: 'digit' },
  { label: '4', kind: 'digit' },
  { label: '5', kind: 'digit' },
  { label: '6', kind: 'digit' },
  { label: '7', kind: 'digit' },
  { label: '8', kind: 'digit' },
  { label: '9', kind: 'digit' },
  { label: '00', kind: 'double' },
  { label: '0', kind: 'digit' },
  { label: '⌫', kind: 'back' },
];

function currentDigits(value: string): string {
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  return Number.isFinite(cents) && cents > 0 ? String(cents) : '';
}

/**
 * Teclado numérico estilo cajero: los dígitos se acumulan desde los centavos
 * (igual que `AmountInput`), sin abrir el teclado del sistema.
 */
export function NumPad({ value, onChange }: NumPadProps) {
  function press(key: (typeof KEYS)[number]) {
    let digits = currentDigits(value);
    if (key.kind === 'back') {
      digits = digits.slice(0, -1);
    } else if (key.kind === 'double') {
      digits = (digits + '00').slice(0, MAX_DIGITS);
    } else {
      digits = (digits + key.label).slice(0, MAX_DIGITS);
    }
    const cents = digits ? parseInt(digits, 10) : 0;
    onChange((cents / 100).toFixed(2));
  }

  return (
    <View className="flex-row flex-wrap border-t border-border bg-surface">
      {KEYS.map((key) => (
        <Pressable
          key={key.label}
          onPress={() => press(key)}
          accessibilityRole="button"
          accessibilityLabel={key.kind === 'back' ? 'Borrar' : key.label}
          className="w-1/3 items-center justify-center border-b border-border/40 py-4 active:bg-surface-2"
        >
          <Text className="text-text text-2xl font-semibold">{key.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
