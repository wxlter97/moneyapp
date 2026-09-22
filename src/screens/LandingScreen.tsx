import { useEffect } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui/Button';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { useColors, type ThemeColors } from '@/theme';
import { lighten } from '@/theme/accents';
import { fonts } from '@/theme/typography';

interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { title: 'Creá tu cuenta', body: 'Sin tarjeta, en menos de un minuto.' },
  {
    title: 'Sumá cómo pagás',
    body: 'Efectivo, tarjetas, cuotas y las monedas que uses.',
  },
  {
    title: 'Registrá o dictá',
    body: 'A mano, por voz, o reenviando el aviso del banco -- lo que te resulte más rápido.',
  },
];

/** Trust row bajo los botones -- corto, concreto, sin cifras de "usuarios"
 * infladas que no podemos respaldar. */
interface TrustItem {
  icon: IconName;
  label: string;
}

const TRUST_ITEMS: TrustItem[] = [
  { icon: 'lock', label: 'Tus datos no se venden' },
  { icon: 'repeat', label: 'Recurrentes sin duplicados' },
  { icon: 'bolt', label: 'Listo en minutos' },
];

/** Filas de la vista previa ilustrativa del presupuesto (dato de ejemplo, no
 * una cuenta real) -- variación tonal de UN solo acento (más el neutro
 * `border`), nunca de `income`/`expense`/`warning`: esos tres son semántica
 * fija en toda la app (ver `theme/index.ts`), no colores decorativos para
 * "dar variedad" a una demo. */
interface MockRow {
  label: string;
  amount: string;
  pct: number;
}

const MOCK_ROWS: MockRow[] = [
  { label: 'Comida', amount: '$186', pct: 0.62 },
  { label: 'Transporte', amount: '$54', pct: 0.31 },
  { label: 'Suscripciones', amount: '$41', pct: 0.88 },
];

function MockBudgetPreview({ colors }: { colors: ThemeColors }) {
  return (
    <View className="bg-surface border-border gap-4 rounded-3xl border p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          Presupuesto de este mes
        </Text>
        <Text className="text-text-muted text-xs">Ejemplo</Text>
      </View>
      <View className="gap-3">
        {MOCK_ROWS.map((row, i) => (
          <View key={row.label} className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-text-muted text-xs">{row.label}</Text>
              <Text className="text-text text-xs" style={{ fontFamily: fonts.semibold }}>
                {row.amount}
              </Text>
            </View>
            <View className="bg-surface-2 h-2 overflow-hidden rounded-full">
              <View
                className="h-2 rounded-full"
                style={{
                  width: `${Math.round(row.pct * 100)}%`,
                  backgroundColor: i === 0 ? colors.primary : lighten(colors.primary, 0.2 + i * 0.18),
                }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
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
      <ScrollView contentContainerClassName="gap-10 py-8" showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[`${colors.primary}26`, `${colors.primary}00`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}
        >
          <View className="gap-6">
            <View className="gap-3">
              <View className="bg-surface-2 border-border flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5">
                <Icon name="trending" color={colors.primary} size={14} />
                <Text className="text-text-muted text-xs" style={{ fontFamily: fonts.semibold }}>
                  Presupuesto pensado para cómo pagás de verdad
                </Text>
              </View>
              <Text className="text-text text-4xl leading-[42px]" style={{ fontFamily: fonts.bold }}>
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

            <View className="flex-row flex-wrap gap-x-5 gap-y-2">
              {TRUST_ITEMS.map((item) => (
                <View key={item.label} className="flex-row items-center gap-1.5">
                  <Icon name={item.icon} color={colors.textMuted} size={14} />
                  <Text className="text-text-muted text-xs">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        <FadeInView index={1}>
          <MockBudgetPreview colors={colors} />
        </FadeInView>

        <View className="gap-4">
          <Text className="text-text text-lg" style={{ fontFamily: fonts.bold }}>
            Todo lo que ya hace, sin vueltas
          </Text>
          <View className="gap-4">
            {FEATURES.map((f, i) => (
              <FadeInView key={f.title} index={i + 2}>
                <View className="flex-row gap-3">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${colors.primary}1F` }}
                  >
                    <Icon name={f.icon} color={colors.primary} size={20} />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                      {f.title}
                    </Text>
                    <Text className="text-text-muted text-sm">{f.body}</Text>
                  </View>
                </View>
              </FadeInView>
            ))}
          </View>
        </View>

        <View className="gap-4">
          <Text className="text-text text-lg" style={{ fontFamily: fonts.bold }}>
            Empezar toma tres pasos
          </Text>
          <View className="gap-4">
            {STEPS.map((step, i) => (
              <View key={step.title} className="flex-row gap-3">
                <View className="bg-primary h-7 w-7 items-center justify-center rounded-full">
                  <Text className="text-primary-fg text-xs" style={{ fontFamily: fonts.bold }}>
                    {i + 1}
                  </Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    {step.title}
                  </Text>
                  <Text className="text-text-muted text-sm">{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Fondo neutro (no `colors.primary`): el botón de abajo es la
            variante primaria de `Button` (`bg-primary`) -- un fondo del
            mismo color lo dejaría invisible, sin contraste contra el banner. */}
        <View className="bg-surface-2 border-border gap-4 rounded-3xl border p-6">
          <View className="gap-1">
            <Text className="text-text text-2xl" style={{ fontFamily: fonts.bold }}>
              ¿Listo para ordenar tus finanzas?
            </Text>
            <Text className="text-text-muted text-sm">
              Creá tu cuenta gratis y sumá tu primera cartera en un par de minutos.
            </Text>
          </View>
          <Button
            label="Empezar gratis"
            onPress={() => router.push('/register')}
            accessibilityLabel="Crear una cuenta"
          />
        </View>

        <Text className="text-text-muted text-center text-xs">
          Sin cookies de rastreo. Tus datos financieros no se venden ni se comparten.
        </Text>
      </ScrollView>
    </Screen>
  );
}
