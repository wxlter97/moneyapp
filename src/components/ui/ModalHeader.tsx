import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

/** Cierra el modal; si no hay pila previa (deep-link), vuelve al historial. */
export function dismissModal() {
  if (router.canGoBack()) router.back();
  else router.replace('/dashboard');
}

export function ModalHeader({ title }: { title: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-text text-lg font-semibold">{title}</Text>
      <Pressable onPress={dismissModal} accessibilityRole="button">
        <Text className="text-text-muted text-base">Cerrar</Text>
      </Pressable>
    </View>
  );
}
