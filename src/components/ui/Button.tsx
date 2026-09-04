import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  onPress,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const press = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  const base = 'h-12 rounded-xl items-center justify-center px-4 flex-row';
  const look = variant === 'primary' ? 'bg-primary' : 'bg-transparent border border-border';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPressIn={() => {
        if (isDisabled) return;
        press.value = withSpring(0.96, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      onPress={(e) => {
        if (isDisabled) return;
        haptics.tap();
        onPress?.(e);
      }}
      {...rest}
    >
      {/* `className` no se resuelve en `Animated.View` de reanimated: el look
          va en una View normal adentro, el `Animated.View` sólo anima el scale. */}
      <Animated.View style={style}>
        <View className={`${base} ${look} ${isDisabled ? 'opacity-50' : ''}`}>
          {loading ? (
            <ActivityIndicator color={variant === 'primary' ? colors.primaryFg : colors.text} />
          ) : (
            <Text
              className={
                variant === 'primary'
                  ? 'text-primary-fg font-semibold text-base'
                  : 'text-text font-semibold text-base'
              }
            >
              {label}
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}
