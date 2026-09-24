import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useWallets } from '@/api/queries';
import { QuickWalletSetup } from '@/components/QuickWalletSetup';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface Step {
  icon: IconName;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: 'gift',
    title: 'Bienvenido a porksupuesto',
    // Los 3 ganchos (cuotas/recurrentes, varias carteras y monedas,
    // presupuesto por categoría) explícitos desde el primer paso, como pedía
    // la auditoría de producto §1.1.
    body: 'Un presupuesto que te va a ayudar a ahorrar de verdad: efectivo, varias tarjetas y cuotas a la vez, en más de una cartera y moneda si hace falta — con presupuesto por categoría, no una hoja de cálculo genérica.',
  },
  {
    icon: 'card',
    title: 'Tus cuentas, de una vez',
    body: 'Cada cuenta, tarjeta o efectivo es una cartera. Poné cuánto tenés hoy en cada una y listo: los detalles (día de corte, límite, meta) se agregan después.',
  },
  {
    icon: 'tag',
    title: 'Las categorías ya están listas',
    body: 'Arrancás con un set armado (Vivienda, Comida, Transporte...). Se editan en Herramientas → Categorías.',
  },
  {
    icon: 'plus',
    title: 'Cómo cargar un movimiento',
    body: 'Con el botón "+" lo cargás a mano, con una foto del recibo o dictándolo. También podés reenviar el aviso de compra de tu banco a tu dirección de Importaciones.',
  },
  {
    icon: 'check',
    title: 'Listo',
    body: 'Recurrentes, compras a plazo, presupuestos compartidos y más viven en Herramientas. Si querés repasar esto, está en Herramientas → Ayuda.',
  },
];

// Paso con la acción real: cargar las carteras con su saldo (ver
// `QuickWalletSetup`). El resto es sólo explicación.
const WALLETS_STEP = 1;

/**
 * Tour de bienvenida, una sola vez por cuenta (ver `User.onboarding_completed`
 * en el backend -- lo dispara `(app)/_layout.tsx` cuando todavía está en
 * `false`). "Saltar" y terminar el último paso hacen lo mismo: marcarlo
 * completado y entrar a la app: no es examen, es orientación.
 */
export default function OnboardingScreen() {
  const colors = useColors();
  const markOnboardingCompleted = useAuthStore((s) => s.markOnboardingCompleted);
  const walletsQ = useWallets();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const currency = useWorkspaceStore(
    (s) => s.workspaces.find((w) => w.id === s.activeId)?.base_currency ?? 'USD',
  );

  const hasWallet = (walletsQ.data?.length ?? 0) > 0;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  // Par `onboarding_started`/`onboarding_finished` para medir abandono en
  // Umami (backlog punto 4): quien empieza y nunca manda el segundo evento
  // -- cierra la app o navega afuera -- es lo que se está midiendo. "Saltar"
  // cuenta como terminado igual que completar el tour (mismo criterio que
  // `finish()`, ver su docstring).
  useEffect(() => {
    track('onboarding_started');
  }, []);

  async function finish() {
    setFinishing(true);
    track('onboarding_finished', { skipped: !isLast });
    try {
      await markOnboardingCompleted();
    } catch {
      // best-effort: si falla el PATCH no vale la pena dejar a alguien
      // trabado en el tour -- lo va a reintentar solo la próxima vez que
      // entre (sigue en `false` hasta que el PATCH pegue).
    } finally {
      router.replace('/dashboard');
    }
  }

  function next() {
    haptics.tap();
    if (isLast) {
      finish();
    } else {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }
  }

  function back() {
    haptics.tap();
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-1 pb-2">
        <View className="flex-row gap-1.5">
          {STEPS.map((_, i) => (
            <View
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: i === step ? colors.text : colors.border }}
            />
          ))}
        </View>
        <Pressable
          onPress={finish}
          disabled={finishing}
          accessibilityRole="button"
          className="py-1 active:opacity-60"
        >
          <Text className="text-text-muted text-sm">Saltar</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow items-center justify-center gap-4 px-4 py-4"
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.primary }}
        >
          <Icon name={current.icon} size={28} color="#FFFFFF" />
        </View>
        <Text className="text-text text-center text-xl" style={{ fontFamily: fonts.bold }}>
          {current.title}
        </Text>
        <Text className="text-text-muted text-center text-sm leading-5">{current.body}</Text>

        {step === WALLETS_STEP ? (
          <View className="mt-2 w-full max-w-[420px] gap-3">
            {createdCount > 0 || hasWallet ? (
              <View className="rounded-2xl bg-income/10 px-4 py-3">
                <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                  {createdCount > 0
                    ? `Listo: ${createdCount} ${createdCount === 1 ? 'cartera creada' : 'carteras creadas'}.`
                    : `Ya tenés ${walletsQ.data?.length} ${walletsQ.data?.length === 1 ? 'cartera' : 'carteras'}.`}
                </Text>
                <Text className="text-text-muted text-xs">
                  Podés agregar más abajo, o seguir.
                </Text>
              </View>
            ) : null}
            <QuickWalletSetup
              currency={currency}
              hasWallets={hasWallet}
              onDone={(n) => setCreatedCount((c) => c + n)}
            />
          </View>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-3 px-1 pb-2">
        {step > 0 ? (
          <View className="flex-1">
            <Button label="Atrás" variant="ghost" onPress={back} />
          </View>
        ) : null}
        <View className="flex-1">
          <Button
            label={isLast ? 'Empezar' : 'Siguiente'}
            loading={finishing && isLast}
            onPress={next}
          />
        </View>
      </View>
    </Screen>
  );
}
