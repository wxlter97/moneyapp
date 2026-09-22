import { useEffect } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { FadeInView } from '@/components/ui/FadeInView';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { FEATURE_LABEL } from '@/lib/planFeatures';
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

/** Tarjeta de "prueba visual": una mini maqueta de UI real (no un ícono
 * genérico) + una afirmación concreta -- el mismo recurso que usan las
 * mejores landings de producto para no quedarse en promesas abstractas,
 * adaptado a los primitivos y la paleta monocromática de esta app (nunca un
 * color vivo "porque sí"). */
function ProofCard({ mock, title, body }: { mock: React.ReactNode; title: string; body: string }) {
  return (
    <View className="bg-surface border-border gap-4 rounded-3xl border p-5">
      {mock}
      <View className="gap-1">
        <Text className="text-text text-base" style={{ fontFamily: fonts.bold }}>
          {title}
        </Text>
        <Text className="text-text-muted text-sm">{body}</Text>
      </View>
    </View>
  );
}

const WALLET_MOCK_ROWS = [
  { label: 'Efectivo', amount: '$120.00' },
  { label: 'Tarjeta BAC', amount: '-$340.00' },
  { label: 'Ahorros', amount: '$900.00' },
];

const NET_WORTH_MOCK_BARS = [18, 30, 24, 40, 52];

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

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-text text-lg" style={{ fontFamily: fonts.bold }}>
        {title}
      </Text>
      {subtitle ? <Text className="text-text-muted text-sm">{subtitle}</Text> : null}
    </View>
  );
}

/** Landing de marketing en `/` para quien no tiene sesión -- ver
 * `src/app/index.tsx`. Autenticado nunca la ve (redirect directo a
 * `/dashboard`), así que no compite con el guard de sesión, sólo lo
 * precede. Usa los mismos primitivos (`Screen`/`Button`/`Icon`) que el
 * resto de la app a propósito: es la misma app, no un micrositio aparte con
 * su propio sistema de diseño.
 *
 * Estructura pensada para explicar todo en una sola página larga (pedido
 * explícito: "algo llamativo donde explica todo, da precios... muestra
 * bastante contenido de forma muy creativa"), pero sin salirse de la
 * identidad monocromática de la marca ni inventar datos: cada afirmación de
 * cada sección está respaldada por código real (ver comentarios puntuales
 * en `PRIVACY_ITEMS`/`PRICING` más arriba). */
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
          <SectionHeader
            title="Menos estrés, más claridad con tu plata"
            subtitle="No se trata de gastar menos. Se trata de saber siempre en qué estás parado."
          />
          <View className="gap-4">
            <FadeInView index={2}>
              <ProofCard
                title="Sabés antes de pasarte"
                body="Los avisos de presupuesto llegan cuando una categoría se acerca al límite, no cuando ya la pasaste."
                mock={
                  <View className="bg-surface-2 gap-2 rounded-2xl p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Icon name="alert" size={14} color={colors.warning} />
                        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                          Comida
                        </Text>
                      </View>
                      <Text className="text-text-muted text-xs">Quedan $34.00</Text>
                    </View>
                    <View className="bg-surface h-2 overflow-hidden rounded-full">
                      <View className="h-2 rounded-full" style={{ width: '83%', backgroundColor: colors.warning }} />
                    </View>
                  </View>
                }
              />
            </FadeInView>

            <FadeInView index={3}>
              <ProofCard
                title="Recurrentes sin duplicados"
                body="Si ya registraste una suscripción a mano, el proceso automático no la vuelve a crear al día siguiente."
                mock={
                  <View className="bg-surface-2 flex-row items-center gap-3 rounded-2xl p-4">
                    <View className="bg-surface h-9 w-9 items-center justify-center rounded-xl">
                      <Icon name="repeat" size={16} color={colors.textMuted} />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                        Netflix
                      </Text>
                      <Text className="text-text-muted text-xs">Recurrente · cada mes</Text>
                    </View>
                    <View className="items-end gap-0.5">
                      <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                        -$9.00
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Icon name="check" size={10} color={colors.income} />
                        <Text style={{ color: colors.income, fontSize: 10 }}>Ya registrado</Text>
                      </View>
                    </View>
                  </View>
                }
              />
            </FadeInView>

            <FadeInView index={4}>
              <ProofCard
                title="Todo en un solo lugar"
                body="Efectivo, tarjetas y cuotas juntos, sin sumar a mano entre apps distintas."
                mock={
                  <View className="bg-surface-2 gap-2.5 rounded-2xl p-4">
                    {WALLET_MOCK_ROWS.map((w) => (
                      <View key={w.label} className="flex-row items-center justify-between">
                        <Text className="text-text-muted text-xs">{w.label}</Text>
                        <Text className="text-text text-xs" style={{ fontFamily: fonts.semibold }}>
                          {w.amount}
                        </Text>
                      </View>
                    ))}
                  </View>
                }
              />
            </FadeInView>

            <FadeInView index={5}>
              <ProofCard
                title="Tu patrimonio, no sólo tu gasto"
                body="Mirá cuánto tenés de verdad entre cuentas, ahorros y deudas -- no sólo cuánto gastaste este mes."
                mock={
                  <View className="bg-surface-2 flex-row items-end gap-1.5 rounded-2xl p-4" style={{ height: 64 }}>
                    {NET_WORTH_MOCK_BARS.map((h, i) => (
                      <View
                        key={i}
                        className="flex-1 rounded-md"
                        style={{ height: h, backgroundColor: i === NET_WORTH_MOCK_BARS.length - 1 ? colors.primary : colors.border }}
                      />
                    ))}
                  </View>
                }
              />
            </FadeInView>
          </View>
        </View>

        <View className="gap-4">
          <SectionHeader title="Todo lo que ya hace, sin vueltas" />
          <View className="gap-4">
            {FEATURES.map((f, i) => (
              <FadeInView key={f.title} index={i + 6}>
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
          <SectionHeader
            title="Tus finanzas son tuyas, punto"
            subtitle="Ni ads ni venta de datos: el negocio es el plan pago, no vos."
          />
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
          <SectionHeader
            title="Es una app web, no una descarga"
            subtitle="Ningún app store, ninguna actualización manual."
          />
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
          <SectionHeader
            title="Empezar toma tres pasos"
            subtitle="Tan simple que lo configurás en el tiempo que te toma un café."
          />
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
          <SectionHeader
            title="Empezá gratis. Subí de nivel cuando quieras."
            subtitle="Te suscribís desde adentro de la app, después de crear tu cuenta -- en dólares, sin permanencia."
          />
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
