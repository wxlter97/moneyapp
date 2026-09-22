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
import { FEATURE_LABEL } from '@/lib/planFeatures';
import { useColors, type ThemeColors } from '@/theme';
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
  { name: 'Transporte', icon: '🚌', color: '#3B82C4', spent: 54.2, budgeted: 175 },
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
 * cuenta real, con datos de ejemplo en vez de los tuyos.
 */
function DashboardPreview() {
  return (
    <View className="bg-surface border-border gap-5 rounded-3xl border p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          Setiembre
        </Text>
        <View className="bg-surface-2 rounded-full px-2 py-0.5">
          <Text className="text-text-muted text-[10px] uppercase tracking-wide">vista de ejemplo</Text>
        </View>
      </View>

      <SummaryTriple income={PREVIEW_INCOME} expenses={PREVIEW_TOTAL_SPENT} currency="USD" />

      <View className="gap-1.5">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            Presupuesto del mes
          </Text>
          <Text className="text-text-muted text-xs">
            <Money value={PREVIEW_TOTAL_SPENT} tone="muted" /> / <Money value={PREVIEW_TOTAL_BUDGETED} tone="muted" />
          </Text>
        </View>
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

/**
 * Vista previa de un movimiento recurrente ya registrado -- mismo layout que
 * `TransactionRow` (avatar de categoría + título/subtítulo + monto en
 * paréntesis + pill de estado), no un ícono genérico con una frase debajo.
 * Demuestra el fix real de recurrentes duplicados: si ya cargaste el gasto a
 * mano, el proceso automático no lo vuelve a crear al día siguiente.
 */
function RecurringPreview({ colors }: { colors: ThemeColors }) {
  return (
    <View className="bg-surface border-border flex-row items-center gap-3 rounded-3xl border p-4">
      <CategoryAvatar icon="📺" color="#8B5CF6" size={40} />
      <View className="flex-1 gap-0.5">
        <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }}>
          Netflix
        </Text>
        <Text className="text-text-muted text-xs">Suscripciones · cada mes</Text>
      </View>
      <View className="items-end gap-1">
        <Money value={-9} tone="expense" parens className="font-semibold" style={{ fontSize: 20, lineHeight: 24 }} />
        <View className="flex-row items-center gap-1">
          <Icon name="check" size={10} color={colors.income} />
          <Text style={{ color: colors.income, fontSize: 10 }}>Ya registrado, sin duplicar</Text>
        </View>
      </View>
    </View>
  );
}

interface PrivacyItem {
  icon: IconName;
  title: string;
  body: string;
}

/** Cada una verificada contra el código real, no aspiracional: 2FA
 * (`LoginScreen`), carteras privadas (`Wallet.visibility`, ver
 * `apps.reports.services`) y borrado de cuenta (`DeleteAccountView`) ya
 * existen hoy -- nada de esto es un "próximamente". */
const PRIVACY_ITEMS: PrivacyItem[] = [
  {
    icon: 'lock',
    title: 'Conexión siempre cifrada',
    body: 'Todo el tráfico entre la app y el servidor viaja por HTTPS.',
  },
  {
    icon: 'face-id',
    title: 'Verificación en dos pasos',
    body: 'Activá 2FA para que, aunque alguien tenga tu contraseña, no pueda entrar a tu cuenta.',
  },
  {
    icon: 'users',
    title: 'Carteras privadas si querés',
    body: 'En un presupuesto compartido, una cartera privada no la ve el resto -- ni en los totales.',
  },
  {
    icon: 'trash',
    title: 'Eliminá tu cuenta cuando quieras',
    body: 'Borrar tu cuenta borra tus datos, no los deja dando vueltas.',
  },
];

interface WebItem {
  icon: IconName;
  title: string;
  body: string;
}

const WEB_ITEMS: WebItem[] = [
  {
    icon: 'bolt',
    title: 'Andá directo desde el navegador',
    body: 'Sin tiendas de apps ni actualizaciones manuales -- abrís el link y ya está.',
  },
  {
    icon: 'download',
    title: 'Instalala en un toque',
    body: 'Agregala a tu pantalla de inicio y se abre como cualquier app, con su propio ícono.',
  },
  {
    icon: 'reset',
    title: 'La misma cuenta en todos lados',
    body: 'Iniciá sesión desde el celular o la computadora -- no hay una versión "solo para uno".',
  },
];

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  highlight?: boolean;
}

/** Mismos planes y precios que `seed_billing_plans.py` (backend, fuente de
 * verdad) -- la landing pública no tiene sesión para pedirle el catálogo
 * real a `GET /plans/` (requiere estar autenticado, ver `apps.billing.api`),
 * así que esto se actualiza a mano si cambian los precios ahí. Sin datos de
 * prueba gratis: `Plan.trial_days` no viene seteado por defecto para Plus/Pro,
 * así que no se promete acá. */
const PRICING: PricingTier[] = [
  {
    name: 'Gratis',
    price: '$0',
    description: 'El loop diario: anotar y ver tus gastos, en solitario.',
    features: ['1 presupuesto propio', 'Sin recurrentes automáticos', 'IA justa para probarla'],
    ctaLabel: 'Empezar con Gratis',
  },
  {
    name: 'Plus',
    price: '$0.99',
    period: '/mes',
    description: 'Todo lo que el gratis deja afuera: miembros, recurrentes y patrimonio.',
    features: [
      FEATURE_LABEL.net_worth,
      FEATURE_LABEL.calendar,
      FEATURE_LABEL.notifications,
      FEATURE_LABEL.installments,
    ],
    ctaLabel: 'Empezar con Plus',
  },
  {
    name: 'Pro',
    price: '$1.99',
    period: '/mes',
    description: 'Workspaces y miembros ilimitados, más todo lo automático.',
    features: [
      FEATURE_LABEL.import_email,
      FEATURE_LABEL.advanced_reports,
      FEATURE_LABEL.loyalty,
      FEATURE_LABEL.backup,
    ],
    ctaLabel: 'Empezar con Pro',
    highlight: true,
  },
];

function PricingCard({ colors, tier }: { colors: ThemeColors; tier: PricingTier }) {
  return (
    <View
      className={`gap-4 rounded-3xl p-5 ${
        tier.highlight ? 'bg-surface border-primary border-2' : 'bg-surface border-border border'
      }`}
    >
      {tier.highlight ? (
        <View className="bg-primary self-start rounded-full px-2.5 py-1">
          <Text className="text-primary-fg text-[10px]" style={{ fontFamily: fonts.bold }}>
            MÁS ELEGIDO
          </Text>
        </View>
      ) : null}
      <View className="gap-1">
        <Text className="text-text text-base" style={{ fontFamily: fonts.bold }}>
          {tier.name}
        </Text>
        <View className="flex-row items-baseline gap-1">
          <Text className="text-text text-3xl" style={{ fontFamily: fonts.bold }}>
            {tier.price}
          </Text>
          {tier.period ? <Text className="text-text-muted text-sm">{tier.period}</Text> : null}
        </View>
        <Text className="text-text-muted text-sm">{tier.description}</Text>
      </View>
      <View className="gap-2">
        {tier.features.map((f) => (
          <View key={f} className="flex-row items-start gap-2">
            <Icon name="check" size={14} color={colors.income} />
            <Text className="text-text-muted flex-1 text-sm">{f}</Text>
          </View>
        ))}
      </View>
      <Button
        label={tier.ctaLabel}
        variant={tier.highlight ? 'primary' : 'ghost'}
        onPress={() => router.push('/register')}
        accessibilityLabel={`Crear cuenta y empezar con ${tier.name}`}
      />
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

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-text text-lg" style={{ fontFamily: fonts.bold }}>
      {title}
    </Text>
  );
}

/** Landing de marketing en `/` para quien no tiene sesión -- ver
 * `src/app/index.tsx`. Autenticado nunca la ve (redirect directo a
 * `/dashboard`), así que no compite con el guard de sesión, sólo lo
 * precede. Usa los mismos primitivos (`Screen`/`Button`/`Icon`) que el
 * resto de la app a propósito: es la misma app, no un micrositio aparte con
 * su propio sistema de diseño.
 *
 * Página larga con mucho contenido real: cada sección respalda una
 * afirmación con código o datos concretos (ver comentarios puntuales en
 * `PRIVACY_ITEMS`/`PRICING`), y la vista previa de "así se ve" (
 * `DashboardPreview`/`RecurringPreview`) reutiliza los componentes REALES
 * del dashboard (`SummaryTriple`, `BudgetMeter`, `CategoryAvatar`, `Money`)
 * en vez de una maqueta inventada -- lo que se ve acá es exactamente lo que
 * se ve adentro de la app. A propósito, sin nada de esto: ni degradados de
 * color vivo, ni "kicker" arriba del título, ni subtítulo genérico bajo
 * cada encabezado de sección -- son recursos de landing de SaaS genérica
 * que no aportan nada acá y sólo la hacían parecerse a cualquier otro
 * sitio de finanzas personales.
 */
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

        <View className="gap-6">
          <View className="gap-3">
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

        <View className="gap-4">
          <SectionHeader title="Así se ve de verdad" />
          <FadeInView index={1}>
            <DashboardPreview />
          </FadeInView>
          <FadeInView index={2}>
            <RecurringPreview colors={colors} />
          </FadeInView>
        </View>

        <View className="gap-4">
          <SectionHeader title="Todo lo que ya hace, sin vueltas" />
          <View className="gap-4">
            {FEATURES.map((f, i) => (
              <FadeInView key={f.title} index={i + 3}>
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
          <SectionHeader title="Tus finanzas son tuyas, punto" />
          <View className="gap-4">
            {PRIVACY_ITEMS.map((item) => (
              <View key={item.title} className="flex-row gap-3">
                <View className="bg-surface-2 h-10 w-10 items-center justify-center rounded-xl">
                  <Icon name={item.icon} color={colors.text} size={18} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    {item.title}
                  </Text>
                  <Text className="text-text-muted text-sm">{item.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-4">
          <SectionHeader title="Es una app web, no una descarga" />
          <View className="gap-3">
            {WEB_ITEMS.map((item) => (
              <View key={item.title} className="bg-surface-2 gap-2 rounded-2xl p-4">
                <Icon name={item.icon} color={colors.primary} size={18} />
                <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                  {item.title}
                </Text>
                <Text className="text-text-muted text-sm">{item.body}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-4">
          <SectionHeader title="Empezar toma tres pasos" />
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

        <View className="gap-4">
          <SectionHeader title="Empezá gratis. Subí de nivel cuando quieras." />
          <View className="gap-4">
            {PRICING.map((tier) => (
              <PricingCard key={tier.name} colors={colors} tier={tier} />
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
