import { Linking, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const CONTACT_EMAIL = 'wxlter.97@gmail.com';

/**
 * Herramientas → Acerca de: qué es la app, quién la hace y en qué versión
 * está. Todo estático -- no pega al backend.
 */
export default function AboutScreen() {
  const colors = useColors();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Acerca de" />

      <ScrollView contentContainerClassName="gap-4 py-2">
        <Card>
          <View className="items-center gap-3 py-2">
            <View
              className="h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.primary }}
            >
              <Icon name="bolt" size={30} color="#FFFFFF" />
            </View>
            <View className="items-center">
              <Text className="text-text text-lg" style={{ fontFamily: fonts.bold }}>
                Budget
              </Text>
              <Text className="text-text-muted text-xs">Versión {version}</Text>
            </View>
          </View>
        </Card>

        <Card title="Qué es">
          <Text className="text-text-muted text-sm leading-5">
            Un presupuesto personal y compartido: carteras, deudas, presupuestos por
            categoría, importación automática de correos bancarios y respaldo de todo
            tu historial. Pensado para llevarlo al día desde el celular, sin hojas de
            cálculo.
          </Text>
        </Card>

        <Card title="Quién lo hace">
          <Text className="text-text-muted text-sm leading-5">
            Un proyecto personal, hecho y mantenido por{' '}
            <Text className="text-text" style={{ fontFamily: fonts.semibold }}>
              wxlter97
            </Text>
            .
          </Text>
          <Text
            className="text-primary mt-3 text-sm"
            style={{ fontFamily: fonts.semibold }}
            onPress={() => {
              haptics.tap();
              Linking.openURL(`mailto:${CONTACT_EMAIL}`);
            }}
          >
            {CONTACT_EMAIL}
          </Text>
        </Card>

        <Text className="text-text-muted self-center text-xs">
          Hecho con Expo + Django.
        </Text>
      </ScrollView>
    </Screen>
  );
}
