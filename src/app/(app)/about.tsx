import { Linking, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { fonts } from '@/theme/typography';

const CONTACT_EMAIL = 'me@wxlter.dev';
const PORTFOLIO_URL = 'https://wxlter.dev';

/**
 * Herramientas → Acerca de: qué es la app, quién la hace y en qué versión
 * está. Todo estático -- no pega al backend.
 */
export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Acerca de" />

      <ScrollView contentContainerClassName="gap-4 py-2">
        <Card>
          <View className="items-center gap-3 py-2">
            <BrandMark size={64} />
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
              wxlter.dev
            </Text>
            .
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
            <Text
              className="text-primary text-sm"
              style={{ fontFamily: fonts.semibold }}
              onPress={() => {
                haptics.tap();
                Linking.openURL(`mailto:${CONTACT_EMAIL}`);
              }}
            >
              {CONTACT_EMAIL}
            </Text>
            <Text
              className="text-primary text-sm"
              style={{ fontFamily: fonts.semibold }}
              onPress={() => {
                haptics.tap();
                Linking.openURL(PORTFOLIO_URL);
              }}
            >
              wxlter.dev
            </Text>
          </View>
        </Card>

        <Card title="Legal">
          <View className="gap-2">
            <Button
              label="Términos de servicio"
              variant="ghost"
              onPress={() => router.push('/terms')}
            />
            <Button label="Privacidad" variant="ghost" onPress={() => router.push('/privacy')} />
            <Button
              label="Reembolsos y cancelación"
              variant="ghost"
              onPress={() => router.push('/refund-policy')}
            />
          </View>
        </Card>

        <Text className="text-text-muted self-center text-xs">
          Hecho con Expo + Django.
        </Text>
      </ScrollView>
    </Screen>
  );
}
