import { useEffect } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

// Mismos ganchos que el onboarding (ver `(app)/onboarding.tsx`): lo que de
// verdad diferencia a la app, no una lista genérica de "controlá tus
// gastos" que podría ser cualquier otra app de presupuesto.
const FEATURES: Feature[] = [
  {
    icon: 'card',
    title: 'Cómo pagás de verdad',
    body: 'Efectivo, varias tarjetas y cuotas a la vez, en más de una cartera y moneda si hace falta.',
  },
  {
    icon: 'repeat',
    title: 'Recurrentes y cuotas',
    body: 'Suscripciones, pagos automáticos y compras a plazo, sin volver a cargarlos a mano cada mes.',
  },
  {
    icon: 'users',
    title: 'Compartido si querés',
    body: 'Un presupuesto puede ser solo tuyo, o compartido con tu casa o tu negocio -- vos decidís.',
  },
  {
    icon: 'mail',
    title: 'Se carga sola',
    body: 'Reenviá el aviso de compra de tu banco y la app lo detecta -- vos solo confirmás.',
  },
  {
    icon: 'mic',
    title: 'Dictado y chat con IA',
    body: 'Decí "almorcé $8 en efectivo" o preguntale a la app cuánto gastaste este mes.',
  },
  {
    icon: 'trending',
    title: 'Presupuesto y patrimonio',
    body: 'Por categoría, con lo que de verdad importa: cuánto tenés, cuánto debés, y hacia dónde vas.',
  },
];

/** Landing de marketing en `/` para quien no tiene sesión -- ver
 * `src/app/index.tsx`. Autenticado nunca la ve (redirect directo a
 * `/dashboard`), así que no compite con el guard de sesión, sólo lo
 * precede. Usa los mismos primitivos (`Screen`/`Button`/`Icon`) que el
 * resto de la app a propósito: es la misma app, no un micrositio aparte con
 * su propio sistema de diseño. */
export function LandingScreen() {
  const colors = useColors();

  useEffect(() => {
    // `+html.tsx`/el postbuild sólo ponen un <title> fijo para toda la SPA
    // (ver `scripts/pwa-postbuild.js`) -- esto lo pisa en esta ruta puntual
    // para el buscador/la pestaña, sin tocar nada del resto de pantallas
    // (que no lo necesitan, están detrás de login).
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'porksupuesto -- presupuesto personal y compartido';
    }
  }, []);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="gap-8 py-8" showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          <Text className="text-text text-3xl" style={{ fontFamily: fonts.bold }}>
            Presupuesto para cómo se paga de verdad
          </Text>
          <Text className="text-text-muted text-base">
            Efectivo, tarjetas, cuotas y varias monedas en un solo lugar -- con presupuesto por
            categoría, no una hoja de cálculo genérica.
          </Text>
        </View>

        <View className="gap-3">
          <Button
            label="Crear cuenta gratis"
            onPress={() => router.push('/register')}
            accessibilityLabel="Crear una cuenta"
          />
          <Button
            label="Ya tengo cuenta"
            variant="ghost"
            onPress={() => router.push('/login')}
            accessibilityLabel="Ingresar a mi cuenta"
          />
        </View>

        <View className="gap-4">
          {FEATURES.map((f) => (
            <View key={f.title} className="flex-row gap-3">
              <View className="bg-surface-2 h-10 w-10 items-center justify-center rounded-xl">
                <Icon name={f.icon} color={colors.primary} size={20} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                  {f.title}
                </Text>
                <Text className="text-text-muted text-sm">{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text className="text-text-muted text-center text-xs">
          Sin cookies de rastreo. Tus datos financieros no se venden ni se comparten.
        </Text>
      </ScrollView>
    </Screen>
  );
}
