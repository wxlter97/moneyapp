import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';

interface SubTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

/** Subtabs de texto con subrayado (VISTA GENERAL · LISTA). */
export function SubTabs<T extends string>({ value, onChange, options }: SubTabsProps<T>) {
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
                active ? 'text-text' : 'text-text-muted'
              }`}
            >
              {o.label}
            </Text>
            <View className={`mt-1 h-0.5 rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
