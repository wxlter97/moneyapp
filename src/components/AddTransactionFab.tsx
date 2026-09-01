import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';

/** Botón flotante "+" para abrir el alta de transacción. */
export function AddTransactionFab() {
  return (
    <Pressable
      onPress={() => router.push('/transaction/new')}
      accessibilityRole="button"
      accessibilityLabel="Agregar transacción"
      className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
    >
      <Text className="text-primary-fg text-2xl leading-none">+</Text>
    </Pressable>
  );
}
