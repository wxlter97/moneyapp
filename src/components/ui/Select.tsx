import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { FadeInView } from './FadeInView';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectProps {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Select con lista desplegable en línea (sin Modal). El panel empuja el
 * contenido del formulario, que va dentro de un ScrollView.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecciona…',
  error,
  disabled = false,
}: SelectProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  return (
    <View className="gap-1.5">
      <Text className="text-text-muted text-sm">{label}</Text>

      <Pressable
        disabled={disabled}
        onPress={() => {
          haptics.tap();
          setOpen((o) => !o);
        }}
        className={`h-12 flex-row items-center justify-between rounded-xl border bg-surface px-3 ${
          open ? 'border-primary' : error ? 'border-expense' : 'border-border'
        } ${disabled ? 'opacity-50' : 'active:opacity-80'}`}
        accessibilityRole="button"
      >
        <Text className={selected ? 'text-text' : 'text-text-muted'} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {error ? <Text className="text-expense text-xs">{error}</Text> : null}

      {open ? (
        <FadeInView>
          <View className="mt-1 overflow-hidden rounded-xl border border-border bg-surface">
            <ScrollView className="max-h-56" keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {options.length === 0 ? (
                <Text className="px-4 py-6 text-center text-text-muted text-sm">
                  No hay opciones.
                </Text>
              ) : (
                options.map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      haptics.selection();
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className="flex-row items-center justify-between px-4 py-3 active:bg-surface-2"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-text text-base" numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text className="text-text-muted text-xs">{item.hint}</Text>
                      ) : null}
                    </View>
                    {item.value === value ? <Icon name="check" size={18} color={colors.primary} /> : null}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </FadeInView>
      ) : null}
    </View>
  );
}
