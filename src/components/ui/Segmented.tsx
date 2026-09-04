import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const count = options.length;
  const pos = useSharedValue(index);

  useEffect(() => {
    pos.value = withSpring(index, { damping: 18, stiffness: 220 });
  }, [index, pos]);

  const pillStyle = useAnimatedStyle(() => ({
    left: `${(pos.value / count) * 100}%`,
  }));

  return (
    <View className="flex-row rounded-xl border border-border bg-surface p-1">
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 4, bottom: 4, width: `${100 / count}%` }, pillStyle]}
        className="rounded-lg bg-primary"
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (!active) haptics.selection();
              onChange(opt.value);
            }}
            className="flex-1 items-center rounded-lg py-2"
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
