import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';

interface SubTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** `light` sobre degradado, `dark` sobre el fondo del tema. */
  tone?: 'light' | 'dark';
}

/** Subtabs de texto con subrayado, estilo Buddy (VISTA GENERAL · GASTO · LISTA). */
export function SubTabs<T extends string>({
  value,
  onChange,
  options,
  tone = 'dark',
}: SubTabsProps<T>) {
  const activeColor = tone === 'light' ? 'text-white' : 'text-text';
  const mutedColor = tone === 'light' ? 'text-white/60' : 'text-text-muted';
  const bar = tone === 'light' ? 'bg-white' : 'bg-primary';

  return (
    <View className="flex-row gap-5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (o.value !== value) haptics.selection();
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              className={`text-xs font-semibold uppercase tracking-wide ${
                active ? activeColor : mutedColor
              }`}
            >
              {o.label}
            </Text>
            <View
              className={`mt-1 h-0.5 rounded-full ${active ? bar : 'bg-transparent'}`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
