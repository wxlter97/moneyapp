import { useEffect } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { BudgetMeter } from '@/components/ui/BudgetMeter';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { FadeInView } from '@/components/ui/FadeInView';
import { Money } from '@/components/ui/Money';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { useIsDesktop } from '@/lib/responsive';
import { fonts } from '@/theme/typography';

/** Categorías de ejemplo para la vista previa -- mismos nombres/emoji que
 * cualquier categoría real de la app (`Category.icon` es un emoji, ver
 * `CategoryAvatar`), no una demo inventada. Ni los montos ni la fecha son de
 * una cuenta real. */
interface PreviewCategory {
  name: string;
  icon: string;
  color: string;
  spent: number;
  budgeted: number;
}

const PREVIEW_CATEGORIES: PreviewCategory[] = [
  { name: 'Comida', icon: '🍔', color: '#E5503B', spent: 186.4, budgeted: 300 },
  { name: 'Suscripciones', icon: '📺', color: '#8B5CF6', spent: 41, budgeted: 45 },
];

const PREVIEW_TOTAL_SPENT = 892.4;
const PREVIEW_TOTAL_BUDGETED = 1100;

/**
 * Vista previa de la pantalla de Presupuesto -- mismo encabezado que
 * `(tabs)/budgets.tsx` (lo que te queda como cifra `hero` + "te queda de"),
 * mismo `BudgetMeter` y mismas filas que `BudgetProgressRow`, con datos de
 * ejemplo. No `SummaryTriple`: sus tres montos no entran dentro de esta
 * tarjeta en un celular angosto y se pisaban entre sí.
 */
function BudgetPreview() {
  const remaining = PREVIEW_TOTAL_BUDGETED - PREVIEW_TOTAL_SPENT;

  return (
    <View className="bg-surface border-border gap-5 rounded-3xl border p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          Agosto
        </Text>
        <Text className="text-text-muted text-[10px] uppercase tracking-wide">vista de ejemplo</Text>
      </View>

      <View>
        <Money hero value={remaining} className="text-[34px] leading-[38px]" />
        <Text className="text-text-muted text-sm">
          te queda de <Money value={PREVIEW_TOTAL_BUDGETED} tone="muted" />
        </Text>
      </View>

      {/* `pt-2` extra: el pin "LÍMITE" del medidor `lg` sobresale ~22px por
          encima de la pista y se montaría sobre el texto de arriba. */}
      <View className="pt-2">
        <BudgetMeter spent={PREVIEW_TOTAL_SPENT} budgeted={PREVIEW_TOTAL_BUDGETED} showTicks size="lg" />
      </View>

      <View className="gap-3">
        {PREVIEW_CATEGORIES.map((c) => (
          <View key={c.name} className="flex-row gap-3">
            <CategoryAvatar icon={c.icon} color={c.color} size={36} />
            <View className="flex-1 gap-1.5">
              <View className="flex-row flex-wrap items-baseline justify-between gap-x-2">
                <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                  {c.name}
                </Text>
                <Text className="text-text-muted text-xs">
                  <Money value={c.spent} tone="muted" /> / <Money value={c.budgeted} tone="muted" />
                </Text>
              </View>
              <BudgetMeter spent={c.spent} budgeted={c.budgeted} size="sm" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Landing de marketing en `/` para quien no tiene sesión -- ver
 * `src/app/index.tsx`. Autenticado nunca la ve (redirect directo a
 * `/dashboard`). Usa los mismos primitivos y la misma paleta que el resto de
 * la app a propósito: es la misma app, no un micrositio aparte.
 *
 * Corta a propósito: título, dos botones, la vista previa real de
 * Presupuesto y un cierre. `variant="wide"` (`Screen`) le da un layout de
 * escritorio de verdad (hero a dos columnas) en vez de la columna angosta de
 * mobile estirada.
 */
export function LandingScreen() {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    // `+html.tsx`/el postbuild sólo ponen un <title> fijo para toda la SPA
    // (ver `scripts/pwa-postbuild.js`) -- esto lo pisa en esta ruta puntual.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'porksupuesto -- presupuesto personal y compartido';
    }
  }, []);

  const heroCopy = (
    <View className="gap-8" style={isDesktop ? { flex: 1.3 } : undefined}>
      <Text
        className={isDesktop ? 'text-text text-5xl leading-[52px]' : 'text-text text-4xl leading-[42px]'}
        style={{ fontFamily: fonts.extrabold, letterSpacing: -1 }}
      >
        Presupuesto que te va a ayudar a ahorrar de verdad
      </Text>

      <View className={isDesktop ? 'flex-row gap-3' : 'gap-3'}>
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
    </View>
  );

  const heroPreview = (
    <FadeInView index={1}>
      <BudgetPreview />
    </FadeInView>
  );

  return (
    <Screen edges={['top', 'bottom']} variant="wide">
      <ScrollView contentContainerClassName="gap-12 py-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <BrandMark size={28} animate={false} />
            <Text className="text-text text-base" style={{ fontFamily: fonts.extrabold, letterSpacing: -0.3 }}>
              porksupuesto
            </Text>
          </View>
          <Text
            className="text-primary text-sm"
            style={{ fontFamily: fonts.semibold }}
            onPress={() => {
              haptics.tap();
              router.push('/login');
            }}
          >
            Iniciar sesión
          </Text>
        </View>

        {isDesktop ? (
          <View className="flex-row items-center gap-12">
            {heroCopy}
            <View style={{ flex: 1 }}>{heroPreview}</View>
          </View>
        ) : (
          <View className="gap-10">
            {heroCopy}
            {heroPreview}
          </View>
        )}

        {/* Fondo neutro (no `colors.primary`): el botón de abajo es la
            variante primaria de `Button` (`bg-primary`) -- un fondo del
            mismo color lo dejaría invisible, sin contraste contra el banner. */}
        <View className="bg-surface-2 border-border gap-4 rounded-3xl border p-6">
          <View className="gap-1">
            <Text className="text-text text-2xl" style={{ fontFamily: fonts.extrabold }}>
              ¿Empezamos?
            </Text>
            <Text className="text-text-muted text-sm">
              Gratis para lo esencial. Los planes pagos se ven dentro de la app, después de crear tu cuenta.
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
