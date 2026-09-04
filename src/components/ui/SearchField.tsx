import { Pressable, TextInput, View } from 'react-native';

import { Icon } from './Icon';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Campo de búsqueda tipo pill, sin borde marcado — icono + texto + limpiar. */
export function SearchField({ value, onChange, placeholder = 'Buscar' }: SearchFieldProps) {
  const colors = useColors();

  return (
    <View className="h-11 flex-row items-center gap-2 rounded-full bg-surface-2 px-4">
      <Icon name="search" size={16} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        className="text-text flex-1 text-sm"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => {
            haptics.tap();
            onChange('');
          }}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          className="active:opacity-60"
        >
          <Icon name="close" size={14} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
