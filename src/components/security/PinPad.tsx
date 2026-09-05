import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface PinPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

/**
 * Teclado 0-9 puro (sin doble-cero ni decimales, a diferencia de `NumPad` que
 * es para montos): sólo dígitos + borrar, para el PIN de bloqueo.
 */
export function PinPad({ onDigit, onBackspace, disabled }: PinPadProps) {
  const colors = useColors();

  return (
    <View className="flex-row flex-wrap">
      {KEYS.map((key, i) =>
        key === '' ? (
          <View key={i} className="w-1/3 py-5" />
        ) : (
          <Pressable
            key={i}
            disabled={disabled}
            onPress={() => {
              haptics.selection();
              if (key === 'back') onBackspace();
              else onDigit(key);
            }}
            accessibilityRole="button"
            accessibilityLabel={key === 'back' ? 'Borrar' : key}
            className="w-1/3 items-center justify-center py-5 active:opacity-50"
          >
            {key === 'back' ? (
              <Icon name="backspace" size={22} color={colors.text} />
            ) : (
              <Text className="text-text text-3xl" style={{ fontFamily: fonts.semibold }}>
                {key}
              </Text>
            )}
          </Pressable>
        ),
      )}
    </View>
  );
}
