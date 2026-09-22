import { Pressable, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';

import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/** 404 de Expo Router: cualquier ruta que no matchea nada (typo en la URL,
 * link viejo, bot rastreando rutas al azar). Sin esto, Expo muestra su
 * pantalla default en inglés, sin el look de la app. */
export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <Screen edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <View className="bg-surface-2 h-16 w-16 items-center justify-center rounded-2xl">
            <Icon name="search" size={28} color={colors.textMuted} />
          </View>
          <Text className="text-text text-xl" style={{ fontFamily: fonts.bold }}>
            Esta pantalla no existe
          </Text>
          <Text className="text-text-muted text-center text-sm">
            El link puede estar viejo o mal escrito.
          </Text>
          <Link href="/" asChild>
            <Pressable accessibilityRole="button" className="py-2 active:opacity-60">
              <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                Volver al inicio
              </Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </>
  );
}
