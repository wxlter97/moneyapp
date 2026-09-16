import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useWallets } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
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
    // Antes era genérico ("presupuesto personal, sin hojas de cálculo") --
    // no decía en qué se diferencia de cualquier otra app. Estos 3 ganchos
    // (cuotas/recurrentes, varias carteras y monedas, presupuesto por
    // categoría) son justamente lo que pedía la auditoría de producto §1.1
    // que apareciera explícito desde el primer paso, no enterrado al final.
    body: 'Para cómo se paga de verdad: efectivo, varias tarjetas y cuotas a la vez, en más de una cartera y moneda si hace falta — con presupuesto por categoría, no una hoja de cálculo genérica. Este tour rápido te muestra lo esencial — lo podés saltar cuando quieras.',
  },
  {
    icon: 'users',
    title: 'Presupuestos',
    body: 'Cada "presupuesto" es un espacio con sus propias carteras y movimientos. Puede ser solo tuyo, o compartido invitando gente (Herramientas → Miembros) — y podés tener más de uno (Casa, Viaje, Negocio).',
  },
  {
    icon: 'card',
    title: 'Carteras',
    body: 'Una cartera es cada cuenta, tarjeta, efectivo o meta de ahorro que tenés -- cada una en su propia moneda si hace falta. Todo lo que registrás pertenece a una.',
  },
  {
    icon: 'card',
    title: 'Creá tu primera cartera',
    body: 'Sin al menos una, no hay dónde registrar nada. Podés agregar más después, y editar cualquiera cuando quieras.',
  },
  {
    icon: 'tag',
    title: 'Las categorías ya están listas',
    body: 'Arrancás con un set armado (Vivienda, Comida, Transporte...) para no empezar de cero. Se pueden editar o agregar las tuyas en Herramientas → Categorías.',
  },
  {
    icon: 'plus',
    title: 'Cómo cargar un movimiento',
    body: 'Con el botón "+" lo cargás a mano. O reenviá el aviso de compra de tu banco a tu dirección de Importaciones y la app lo detecta sola — vos solo confirmás.',
  },
  {
    icon: 'trending',
    title: 'Y hay más',
    body: 'Gastos recurrentes, compras a plazo, presupuesto por categoría, respaldo de todo... vive en Herramientas. No hace falta memorizarlo ahora: la sección de Ayuda lo explica cuando lo necesites.',
  },
  {
    icon: 'check',
    title: 'Listo',
    body: 'Ya podés empezar. Si en algún momento querés repasar esto, lo encontrás en Herramientas → Ayuda.',
  },
];

// Único paso con una acción real (el resto es sólo explicación) -- entra al
// mismo formulario de siempre (`wallet/new`), no una versión simulada.
const CREATE_WALLET_STEP = 3;

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

  const hasWallet = (walletsQ.data?.length ?? 0) > 0;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  async function finish() {
    setFinishing(true);
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

      <View className="flex-1 items-center justify-center gap-4 px-4">
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

        {step === CREATE_WALLET_STEP ? (
          <View className="mt-2 w-full max-w-[280px]">
            <Button
              label={hasWallet ? 'Agregar otra cartera' : 'Crear mi primera cartera'}
              variant="ghost"
              onPress={() => {
                haptics.tap();
                router.push('/wallet/new');
              }}
            />
          </View>
        ) : null}
      </View>

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
