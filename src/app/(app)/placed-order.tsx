import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useMyPlan } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/** Cada cuánto se vuelve a preguntar si el pago ya activó el plan. */
const POLL_MS = 3_000;
/** Tras este tiempo se deja de esperar y se explica que puede tardar. */
const GIVE_UP_MS = 90_000;

/**
 * A donde Wompi devuelve a la persona después de pagar (`/placed-order`): es la
 * «Redirect URL» del negocio en el panel de Wompi y la `urlRedirect` de los enlaces
 * de pago único (ver `pro.tsx`).
 *
 * **No confía en nada de lo que trae la URL** (`idTransaccion`, `monto`, `hash`…):
 * cualquiera puede abrir `/placed-order?...` a mano. El plan lo activa el webhook,
 * que llega de servidor a servidor y va firmado; esta pantalla sólo pregunta a la
 * API por el plan y espera a que cambie. Como el webhook y la redirección corren
 * en paralelo, lo normal es que al llegar aún no esté aplicado.
 */
export default function PlacedOrderScreen() {
  const colors = useColors();
  const myPlan = useMyPlan();
  const [timedOut, setTimedOut] = useState(false);

  const plan = myPlan.data?.plan;
  const activated = plan != null && !plan.is_default;

  useEffect(() => {
    if (activated) return;
    const poll = setInterval(() => void myPlan.refetch(), POLL_MS);
    const giveUp = setTimeout(() => setTimedOut(true), GIVE_UP_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(giveUp);
    };
    // `refetch` es estable; se reinicia sólo si el plan pasa a estar activado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activated]);

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Tu pago" />
      <View className="flex-1 items-center justify-center gap-4 px-6">
        {activated ? (
          <>
            <View
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              <Icon name="star" size={28} color="#FFFFFF" />
            </View>
            <Text className="text-text text-center text-xl" style={{ fontFamily: fonts.bold }}>
              ¡Listo! Ya tienes {plan!.name}
            </Text>
            <Text className="text-text-muted text-center text-sm">
              Recibimos tu pago y tu plan quedó activo.
            </Text>
            <Button label="Continuar" onPress={() => router.replace('/')} />
          </>
        ) : timedOut ? (
          <>
            <Text className="text-text text-center text-xl" style={{ fontFamily: fonts.bold }}>
              Todavía no vemos la confirmación
            </Text>
            <Text className="text-text-muted text-center text-sm">
              A veces el banco tarda unos minutos en confirmar. Si el pago se hizo, tu plan se
              activa solo; no hace falta pagar otra vez. Puedes revisar el estado en Pro.
            </Text>
            <Button label="Ver mi plan" onPress={() => router.replace('/pro')} />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text className="text-text text-center text-xl" style={{ fontFamily: fonts.bold }}>
              Confirmando tu pago…
            </Text>
            <Text className="text-text-muted text-center text-sm">
              Esto toma unos segundos. No cierres esta pantalla.
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}
