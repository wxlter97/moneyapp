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
      style={{
        position: 'absolute',
        right: 24,
        bottom: 28,
        transform: [{ scale: v }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 8,
      }}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => router.push('/transaction/new')}
        accessibilityRole="button"
        accessibilityLabel="Agregar transacción"
        className="h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-80"
      >
        <Text className="text-primary-fg text-2xl leading-none">+</Text>
      </Pressable>
    </Animated.View>
  );
}
