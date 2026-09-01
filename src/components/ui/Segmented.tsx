import { Pressable, Text, View } from 'react-native';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  return (
    <View className="flex-row rounded-xl border border-border bg-surface p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded-lg py-2 ${active ? 'bg-primary' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text className={active ? 'text-primary-fg font-semibold' : 'text-text-muted'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
