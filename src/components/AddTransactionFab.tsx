import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { router } from 'expo-router';

/** Botón flotante "+" para abrir el alta de transacción. */
export function AddTransactionFab() {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
  }, [v]);

  return (
    <Animated.View
      style={{ transform: [{ scale: v }] }}
      className="absolute bottom-5 right-5"
    >
      <Pressable
        onPress={() => router.push('/transaction/new')}
        accessibilityRole="button"
        accessibilityLabel="Agregar transacción"
        className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
      >
        <Text className="text-primary-fg text-2xl leading-none">+</Text>
      </Pressable>
    </Animated.View>
  );
}
