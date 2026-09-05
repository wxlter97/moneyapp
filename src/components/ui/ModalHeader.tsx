import { useEffect, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from './Icon';
import { useDismissGesture } from './Screen';
import { haptics } from '@/lib/haptics';
import { dismissModal } from '@/lib/modal';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

export { dismissModal };

/**
 * Cabecera de hoja modal, estilo HIG: manija de arrastre + título + botón de
 * cierre circular (en vez del texto "Cerrar" de un sitio web).
 */
export function ModalHeader({ title, right }: { title: string; right?: ReactNode }) {
  const colors = useColors();
  const press = useSharedValue(1);
  const enter = useSharedValue(0);
  const dismissGesture = useDismissGesture();

  useEffect(() => {
    enter.value = withTiming(1, { duration: 260 });
  }, [enter]);

  const closeStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const headerStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 6 }],
  }));

  const handle = (
    // Área de toque generosa (el pill visual es angosto) para que arrastrar
    // para cerrar sea fácil de agarrar sin exigir precisión de píxel.
    <View
      testID="modal-drag-handle"
      accessibilityRole="adjustable"
      accessibilityLabel="Arrastrar para cerrar"
      className="items-center px-6 pb-2 pt-3"
    >
      <View className="h-1.5 w-10 rounded-full bg-border" />
    </View>
  );

  return (
    <View>
      {dismissGesture ? <GestureDetector gesture={dismissGesture}>{handle}</GestureDetector> : handle}
      <Animated.View style={headerStyle}>
        <View className="flex-row items-center justify-between py-2">
          <Text
            className="text-text flex-1 pr-3 text-lg"
            style={{ fontFamily: fonts.bold }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {right ? <View className="mr-2">{right}</View> : null}
          <Pressable
            onPress={() => {
              haptics.tap();
              dismissModal();
            }}
            onPressIn={() => {
              press.value = withSpring(0.88, { damping: 14, stiffness: 320 });
            }}
            onPressOut={() => {
              press.value = withSpring(1, { damping: 14, stiffness: 320 });
            }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            {/* `className` no se resuelve en `Animated.View` de reanimated (nativewind
                sólo intercepta los primitivos de react-native): el tamaño/color van acá
                en una View normal, y el `Animated.View` de afuera sólo anima el scale. */}
            <Animated.View style={closeStyle}>
              <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-2">
                <Icon name="close" size={16} color={colors.textMuted} />
              </View>
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
