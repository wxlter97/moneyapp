import { useEffect } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { BrandMark } from '@/components/BrandMark';
import { SummaryTriple } from '@/components/SummaryTriple';
import { Button } from '@/components/ui/Button';
import { BudgetMeter } from '@/components/ui/BudgetMeter';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { useIsDesktop } from '@/lib/responsive';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/** Trust row bajo los botones -- corto, concreto, sin cifras de "usuarios"
 * infladas que no podemos respaldar. */
interface TrustItem {
  icon: IconName;
  label: string;
}

const TRUST_ITEMS: TrustItem[] = [
  { icon: 'lock', label: 'Tus datos no se venden' },
  { icon: 'bolt', label: 'Sin instalar nada' },
];

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
const PREVIEW_INCOME = 1450;

/**
 * Vista previa del panel de presupuesto -- reutiliza los mismos componentes
 * que `(app)/budgets.tsx` y el dashboard real (`SummaryTriple`,
 * `BudgetMeter`, `CategoryAvatar`, `Money`), con la misma disposición que
 * `BudgetProgressRow` (nombre + montos + medidor). No es una maqueta
 * inventada para la landing: es literalmente el mismo pixel que ve cualquier
 * cuenta real, con datos de ejemplo en vez de los tuyos. Hace de "hero
 * panel" al costado del título en desktop -- no una sección aparte.
 */
function DashboardPreview() {
  return (
    <View className="bg-surface border-border gap-5 rounded-3xl border p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          Setiembre
        </Text>
        <Text className="text-text-muted text-[10px] uppercase tracking-wide">vista de ejemplo</Text>
      </View>

      <SummaryTriple income={PREVIEW_INCOME} expenses={PREVIEW_TOTAL_SPENT} currency="USD" />

      <View className="gap-3">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          Presupuesto del mes
        </Text>
        {/* Sin monto arriba de la pista: el pin "LÍMITE" (`BudgetMeter`,
            tamaño `lg`) sobresale por encima del track y queda encima de un
            texto pegado justo ahí -- por eso acá va sólo el título, con más
            aire (`gap-3`) antes del medidor. Los montos ya están en
            `SummaryTriple` arriba y en las etiquetas de `showTicks` abajo. */}
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

interface Differentiator {
  icon: IconName;
  title: string;
  body: string;
}

/** Sólo cuatro, y cada una verificada contra código real, no aspiracional:
 * el fix de recurrentes duplicados es el de este mismo PR, la importación
 * por correo y las carteras privadas/2FA ya existen hoy -- nada de esto es
 * un "próximamente" ni una promesa genérica de "controlá tus gastos". */
const DIFFERENTIATORS: Differentiator[] = [
  {
    icon: 'card',
    title: 'Cómo pagás de verdad',
    body: 'Efectivo, varias tarjetas y cuotas a la vez, en más de una moneda si hace falta.',
  },
  {
    icon: 'repeat',
    title: 'Recurrentes sin duplicados',
    body: 'Si ya cargaste el gasto a mano, el proceso automático no lo vuelve a crear al día siguiente.',
  },
  {
    icon: 'mail',
    title: 'Se carga sola',
    body: 'Reenviá el aviso de compra de tu banco y la app lo detecta -- vos solo confirmás.',
  },
  {
    icon: 'lock',
    title: 'Privado si querés',
    body: 'Una cartera puede quedar fuera de los totales compartidos, y 2FA cuida el acceso.',
  },
];

/** Etiqueta corta en el acento, sin pill ni ícono -- una sola por página,
 * sobre la grilla de diferenciales. No es un "kicker" de SaaS genérico: es
 * texto plano, no una insignia con borde. */
function Eyebrow({ children }: { children: string }) {
  const colors = useColors();
  return (
    <Text
      className="text-xs uppercase"
      style={{ fontFamily: fonts.bold, letterSpacing: 2, color: colors.primary }}
    >
      {children}
    </Text>
  );
}

/** Landing de marketing en `/` para quien no tiene sesión -- ver
 * `src/app/index.tsx`. Autenticado nunca la ve (redirect directo a
 * `/dashboard`), así que no compite con el guard de sesión, sólo lo
 * precede. Usa los mismos primitivos (`Screen`/`Button`/`Icon`) y la misma
 * paleta que el resto de la app a propósito: es la misma app, no un
 * micrositio aparte con su propio sistema de diseño ni una copia de otro
 * sitio.
 *
 * Corta a propósito: un hero (con la vista previa REAL del dashboard al
 * costado en desktop, `DashboardPreview`), cuatro cosas concretas que ya
 * hace (`DIFFERENTIATORS`) y un cierre -- nada de features/privacidad/PWA/
 * pasos/precios como secciones aparte, eso vive dentro de la app una vez
 * que hay cuenta. `variant="wide"` (`Screen`) le da un layout de escritorio
 * de verdad -- hero a dos columnas y grilla de 2×2 -- en vez de la misma
 * columna angosta de mobile estirada a 560px.
 */
export function LandingScreen() {
  const colors = useColors();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    // `+html.tsx`/el postbuild sólo ponen un <title> fijo para toda la SPA
    // (ver `scripts/pwa-postbuild.js`) -- esto lo pisa en esta ruta puntual
    // para el buscador/la pestaña, sin tocar nada del resto de pantallas
    // (que no lo necesitan, están detrás de login).
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'porksupuesto -- presupuesto personal y compartido';
    }
  }, []);

  const heroCopy = (
    <View className="gap-6" style={isDesktop ? { flex: 1.3 } : undefined}>
      <View className="gap-3">
        <Text
          className={isDesktop ? 'text-text text-5xl leading-[52px]' : 'text-text text-4xl leading-[42px]'}
          style={{ fontFamily: fonts.extrabold, letterSpacing: -1 }}
        >
          Presupuesto para cómo se paga de verdad
        </Text>
        <Text className="text-text-muted text-base">
          Efectivo, tarjetas, cuotas y varias monedas en un solo lugar.
        </Text>
      </View>

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

      <View className="flex-row flex-wrap gap-x-5 gap-y-2">
        {TRUST_ITEMS.map((item) => (
          <View key={item.label} className="flex-row items-center gap-1.5">
            <Icon name={item.icon} color={colors.textMuted} size={14} />
            <Text className="text-text-muted text-xs">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const heroPreview = (
    <View style={isDesktop ? { flex: 1, marginTop: 4 } : undefined}>
      <DashboardPreview />
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']} variant="wide">
      <ScrollView contentContainerClassName="gap-10 py-4" showsVerticalScrollIndicator={false}>
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
          <View className="flex-row items-start gap-10">
            {heroCopy}
            <FadeInView index={1}>{heroPreview}</FadeInView>
          </View>
        ) : (
          <View className="gap-8">
            {heroCopy}
            <FadeInView index={1}>{heroPreview}</FadeInView>
          </View>
        )}

        <View className="gap-4">
          <Eyebrow>Lo que ya hace</Eyebrow>
          <View className={isDesktop ? 'flex-row flex-wrap gap-4' : 'gap-4'}>
            {DIFFERENTIATORS.map((d, i) => (
              <View key={d.title} style={isDesktop ? { width: '48%' } : undefined}>
                <FadeInView index={i + 2}>
                  <View className="bg-surface border-border flex-row gap-3 rounded-2xl border p-4">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${colors.primary}1F` }}
                    >
                      <Icon name={d.icon} color={colors.primary} size={20} />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                        {d.title}
                      </Text>
                      <Text className="text-text-muted text-sm">{d.body}</Text>
                    </View>
                  </View>
                </FadeInView>
              </View>
            ))}
          </View>
        </View>

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
