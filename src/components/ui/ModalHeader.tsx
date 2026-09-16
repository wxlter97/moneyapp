import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { IconButton } from './IconButton';
import { useDismissGesture } from './Screen';
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
          {/* `className` no se resuelve en `Animated.View` de reanimated (nativewind
              sólo intercepta los primitivos de react-native): el `IconButton` de
              adentro trae su propia `View` normal, y este `Animated.View` sólo
              anima el scale del conjunto. */}
          <Animated.View style={closeStyle}>
            <IconButton
              icon="close"
              size={32}
              iconSize={16}
              color={colors.textMuted}
              onPress={dismissModal}
              onPressIn={() => {
                press.value = withSpring(0.88, { damping: 14, stiffness: 320 });
              }}
              onPressOut={() => {
                press.value = withSpring(1, { damping: 14, stiffness: 320 });
              }}
              accessibilityLabel="Cerrar"
              className="rounded-full bg-surface-2"
            />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
