import { ScrollView, Text, View, Pressable } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { FadeInView } from './FadeInView';
import { Icon } from './Icon';
import type { SelectOption } from './Select';

interface PickerRowProps {
  label: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  open: boolean;
  onToggle: () => void;
  placeholder?: string;
  error?: string;
}

/**
 * Fila compacta "Etiqueta ......... Valor ›" que despliega la lista de opciones
 * en flujo (sin Modal, que en SDK 57 no se oculta de forma fiable).
 */
export function PickerRow({
  label,
  options,
  value,
  onChange,
  open,
  onToggle,
  placeholder = 'Elegir',
  error,
}: PickerRowProps) {
  const colors = useColors();
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <View>
      <Pressable
        onPress={() => {
          haptics.tap();
          onToggle();
        }}
        accessibilityRole="button"
        className={`h-12 flex-row items-center justify-between border-b px-1 ${
          error ? 'border-expense' : 'border-border/60'
        } active:opacity-70`}
      >
        <Text className="text-text-muted text-sm">{label}</Text>
        <View className="flex-row items-center gap-2">
          <Text className={selected ? 'text-text' : 'text-text-muted'} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      {error ? <Text className="text-expense mt-1 text-xs">{error}</Text> : null}

      {open ? (
        <FadeInView>
          <View className="mt-1 overflow-hidden rounded-xl border border-border bg-surface">
            <ScrollView className="max-h-64" keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {options.length === 0 ? (
                <Text className="text-text-muted px-4 py-6 text-center text-sm">
                  No hay opciones.
                </Text>
              ) : (
                options.map((o) => (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      haptics.selection();
                      onChange(o.value);
                    }}
                    className="flex-row items-center justify-between px-4 py-3 active:bg-surface-2"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-text text-base" numberOfLines={1}>
                        {o.label}
                      </Text>
                      {o.hint ? <Text className="text-text-muted text-xs">{o.hint}</Text> : null}
                    </View>
                    {o.value === value ? <Icon name="check" size={18} color={colors.primary} /> : null}
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
