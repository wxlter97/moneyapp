import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';

/** Botón flotante "+" para abrir el alta de transacción. */
export function AddTransactionFab() {
  const enter = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    enter.value = withSpring(1, { damping: 11, stiffness: 140 });
  }, [enter]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: enter.value * press.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          right: 24,
          bottom: 104,
          shadowColor: '#4F8CFF',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        },
        style,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => {
          haptics.impact();
          router.push('/transaction/new');
        }}
        onPressIn={() => {
          press.value = withSpring(0.9, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 14, stiffness: 320 });
        }}
        accessibilityRole="button"
        accessibilityLabel="Agregar transacción"
      >
        <LinearGradient
          colors={['#6AA3FF', '#4F8CFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 58, width: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="plus" size={26} color="#FFFFFF" strokeWidth={2.4} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
