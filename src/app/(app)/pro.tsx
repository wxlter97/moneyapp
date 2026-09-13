import { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';

import { useCancelSubscription, useCheckout, useMyPlan, usePlans } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { BillingPeriod, Plan, PlanPrice } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { FEATURE_LABEL, type FeatureKey } from '@/lib/planFeatures';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: 'Mensual',
  annual: 'Anual',
  lifetime: 'De por vida',
};

/** "Hasta 1 presupuesto, 2 miembros por presupuesto" -- construido a partir
 * de los límites reales del plan gratis, no de un texto fijo, para que
 * cambiar un límite en el admin se refleje acá solo. */
function limitsSummary(plan: Plan | null | undefined): string {
  if (!plan) return '';
  const bits: string[] = [];
  if (plan.max_workspaces_owned != null) {
    bits.push(`${plan.max_workspaces_owned} presupuesto${plan.max_workspaces_owned === 1 ? '' : 's'}`);
  }
  if (plan.max_members_per_workspace != null) {
    bits.push(`${plan.max_members_per_workspace} miembros por presupuesto`);
  }
  if (plan.max_active_recurring != null) {
    bits.push(`${plan.max_active_recurring} recurrentes activos`);
  }
  return bits.length ? `Hasta ${bits.join(', ')}` : 'Sin límites';
}

/**
 * Herramientas → Cuenta → Pro. Muestra el plan efectivo del usuario y, si
 * está en el gratis, el catálogo de precios (`GET /plans/`) para suscribirse
 * -- nada de nombre/límite/precio está hardcodeado acá, todo sale del
 * backend para poder ajustarlo sin subir versión nueva. El checkout
 * redirige al proveedor de pago (Wompi); al volver, la app reabre acá
 * mismo (`ExpoLinking.createURL('/pro')`) y el estado se refresca solo la
 * próxima vez que se abra esta pantalla.
 */
export default function ProScreen() {
  const colors = useColors();
  const myPlan = useMyPlan();
  const plansQuery = usePlans();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();

  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isPro = myPlan.data?.plan?.code === 'pro';
  const proPlan = plansQuery.data?.find((p) => p.code === 'pro');
  const prices = (proPlan?.prices ?? []).filter((p) => p.is_active);
  const proFeatures = Object.keys(proPlan?.features ?? {}).filter((key) => proPlan?.features[key]);

  async function onSubscribe(price: PlanPrice) {
    setError(null);
    setPendingPriceId(price.id);
    try {
      const redirect = ExpoLinking.createURL('/pro');
      const { checkout_url } = await checkout.mutateAsync({
        plan_price: price.id,
        success_url: redirect,
        cancel_url: redirect,
      });
      await Linking.openURL(checkout_url);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo iniciar el pago.'));
    } finally {
      setPendingPriceId(null);
    }
  }

  async function onCancel() {
    setError(null);
    try {
      await cancel.mutateAsync();
      haptics.success();
      setConfirmCancel(false);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo cancelar la suscripción.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Pro" />
      <ScrollView contentContainerClassName="gap-4 py-2">
        {myPlan.isLoading ? (
          <LoadingState />
        ) : myPlan.isError ? (
          <ErrorState error={myPlan.error} onRetry={() => myPlan.refetch()} />
        ) : (
          <>
            <Card>
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: isPro ? colors.primary : colors.surface2 }}
                >
                  <Icon name="star" size={18} color={isPro ? '#FFFFFF' : colors.textMuted} />
                </View>
                <View className="flex-1">
                  <Text className="text-text text-base" style={{ fontFamily: fonts.bold }}>
                    {isPro ? 'Tenés Pro' : 'Estás en el plan Gratis'}
                  </Text>
                  <Text className="text-text-muted text-xs">
                    {isPro
                      ? myPlan.data?.subscription?.current_period_end
                        ? `Renueva el ${new Date(
                            myPlan.data.subscription.current_period_end,
                          ).toLocaleDateString('es')}`
                        : 'Sin fecha de vencimiento'
                      : limitsSummary(myPlan.data?.plan)}
                  </Text>
                </View>
              </View>
            </Card>

            {isPro ? (
              <Card title="Tu suscripción">
                {confirmCancel ? (
                  <View className="gap-3">
                    <Text className="text-text-muted text-sm leading-5">
                      ¿Cancelar tu suscripción Pro? Seguís teniendo acceso hasta que termine el
                      período ya pagado.
                    </Text>
                    {error ? <Text className="text-expense text-xs">{error}</Text> : null}
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Button
                          label="Volver"
                          variant="ghost"
                          onPress={() => setConfirmCancel(false)}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Cancelar suscripción"
                          loading={cancel.isPending}
                          onPress={onCancel}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <Button
                    label="Cancelar suscripción"
                    variant="ghost"
                    onPress={() => setConfirmCancel(true)}
                  />
                )}
              </Card>
            ) : (
              <>
                {proFeatures.length > 0 ? (
                  <Card title="Con Pro conseguís">
                    <View className="gap-2.5">
                      {proFeatures.map((key) => (
                        <View key={key} className="flex-row items-center gap-2">
                          <Icon name="check" size={14} color={colors.income} />
                          <Text className="text-text-muted flex-1 text-sm">
                            {FEATURE_LABEL[key as FeatureKey] ?? key}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                ) : null}

                <Card title="Elegí tu plan">
                  {plansQuery.isLoading ? (
                    <LoadingState />
                  ) : prices.length === 0 ? (
                    <Text className="text-text-muted text-sm">
                      Todavía no hay precios configurados.
                    </Text>
                  ) : (
                    <View className="gap-2">
                      {prices.map((price) => (
                        <Button
                          key={price.id}
                          label={`${PERIOD_LABEL[price.billing_period]} · ${formatMoney(
                            price.amount,
                            price.currency,
                          )}`}
                          loading={pendingPriceId === price.id}
                          disabled={checkout.isPending}
                          onPress={() => onSubscribe(price)}
                        />
                      ))}
                    </View>
                  )}
                  {error ? <Text className="text-expense mt-2 text-xs">{error}</Text> : null}
                </Card>

                <Text className="text-text-muted px-2 text-center text-xs leading-4">
                  Al suscribirte aceptás los{' '}
                  <Text
                    className="text-primary"
                    onPress={() => {
                      haptics.tap();
                      router.push('/terms');
                    }}
                  >
                    Términos de servicio
                  </Text>{' '}
                  y la{' '}
                  <Text
                    className="text-primary"
                    onPress={() => {
                      haptics.tap();
                      router.push('/refund-policy');
                    }}
                  >
                    política de reembolsos
                  </Text>
                  .
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
