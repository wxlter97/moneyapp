import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface } from './GlassSurface';
import { haptics } from '@/lib/haptics';
import { useSnackbarStore } from '@/store/snackbar';
import { fonts } from '@/theme/typography';

/**
 * Host único, montado una vez en la raíz. Flota sobre todo (incluida la
 * barra de tabs) con espacio suficiente para no taparla — el mismo margen
 * inferior generoso que usa el FAB de "Agregar movimiento".
 */
export function SnackbarHost() {
  const insets = useSafeAreaInsets();
  const visible = useSnackbarStore((s) => s.visible);
  const message = useSnackbarStore((s) => s.message);
  const actionLabel = useSnackbarStore((s) => s.actionLabel);
  const onAction = useSnackbarStore((s) => s.onAction);
  const hide = useSnackbarStore((s) => s.hide);

  const style = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 180 }),
    transform: [{ translateY: withSpring(visible ? 0 : 24, { damping: 18, stiffness: 260 }) }],
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + 108,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 18,
          elevation: 8,
        },
        style,
      ]}
    >
      <GlassSurface radius={18}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Text className="text-text flex-1 text-sm" numberOfLines={2}>
            {message}
          </Text>
          {actionLabel ? (
            <Pressable
              onPress={() => {
                haptics.tap();
                onAction?.();
                hide();
              }}
              accessibilityRole="button"
              className="active:opacity-60"
            >
              <Text className="text-primary text-sm" style={{ fontFamily: fonts.bold }}>
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </GlassSurface>
    </Animated.View>
  );
}
