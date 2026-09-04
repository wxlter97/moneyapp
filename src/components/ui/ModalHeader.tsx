import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from './Icon';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';

/** Cierra el modal; si no hay pila previa (deep-link), vuelve al historial. */
export function dismissModal() {
  if (router.canGoBack()) router.back();
  else router.replace('/dashboard');
}

/**
 * Cabecera de hoja modal, estilo HIG: manija de arrastre + título + botón de
 * cierre circular (en vez del texto "Cerrar" de un sitio web).
 */
export function ModalHeader({ title }: { title: string }) {
  const colors = useColors();
  const press = useSharedValue(1);
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 260 });
  }, [enter]);

  const closeStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const headerStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 6 }],
  }));

  return (
    <View>
      <View className="items-center pb-1 pt-2">
        <View className="h-1.5 w-10 rounded-full bg-border" />
      </View>
      <Animated.View style={headerStyle} className="flex-row items-center justify-between py-2">
        <Text className="text-text flex-1 pr-3 text-lg font-semibold" numberOfLines={1}>
          {title}
        </Text>
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
          <Animated.View
            style={closeStyle}
            className="h-8 w-8 items-center justify-center rounded-full bg-surface-2"
          >
            <Icon name="close" size={16} color={colors.textMuted} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
