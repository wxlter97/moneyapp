import { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';

import {
  useCancelSubscription,
  useCheckout,
  useMyPlan,
  usePlans,
  useRedeemPromoCode,
  useStartTrial,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { BillingPeriod, Plan, PlanPrice, Subscription, SubscriptionStatus } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { formatLongDateTime } from '@/lib/date';
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

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  pending: 'Pendiente de confirmación',
  active: 'Activa',
  past_due: 'Pago vencido',
  canceled: 'Cancelada',
  expired: 'Expirada',
};

/** `Subscription.provider` es texto libre del backend (`manual`, `wompi`,
 * el próximo que se agregue) -- si aparece uno que no conocemos, mostramos
 * el valor tal cual en vez de esconderlo, mejor para la transparencia que
 * pedimos acá que un genérico "otro". */
const PROVIDER_LABEL: Record<string, string> = {
  manual: 'Alta manual o código de invitación',
  wompi: 'Wompi',
};

/** "Activa" a secas confunde si ya pidió cancelar y sólo le queda correr el
 * reloj hasta `current_period_end` -- se nota en el estado (no en
 * `canceled_at` solo) para que sea imposible de pasar por alto. */
function subscriptionStatusLabel(sub: Subscription): string {
  const base = STATUS_LABEL[sub.status];
  return sub.canceled_at && sub.status !== 'canceled' ? `${base} · no se renueva` : base;
}

function subscriptionMethodLabel(sub: Subscription): string {
  if (sub.is_trial) return 'Prueba gratis';
  return PROVIDER_LABEL[sub.provider] ?? sub.provider;
}

/** Fila de "Detalles de tu suscripción" -- toda la data cruda que ya manda
 * el backend (`SubscriptionSerializer`) y antes se quedaba sin mostrar. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-text-muted text-sm">{label}</Text>
      <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
        {value}
      </Text>
    </View>
  );
}

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
    const n = plan.max_members_per_workspace;
    bits.push(n === 1 ? 'sin invitados' : `${n} miembros por presupuesto`);
  }
  if (plan.max_active_recurring != null) {
    const n = plan.max_active_recurring;
    bits.push(n === 0 ? 'sin recurrentes' : `${n} recurrentes activos`);
  }
  return bits.length ? `Hasta ${bits.join(', ')}` : 'Sin límites';
}

/** Precio activo más barato de un plan (para ordenar el catálogo de menor a
 * mayor); un plan sin precios activos va al final. */
function cheapestActivePrice(plan: Plan): number {
  const amounts = (plan.prices ?? []).filter((p) => p.is_active).map((p) => p.amount);
  return amounts.length > 0 ? Math.min(...amounts) : Infinity;
}

/**
 * Herramientas → Cuenta → Pro. Muestra el plan efectivo del usuario y, si
 * está en el gratis, el catálogo de planes pagos (`GET /plans/`, puede haber
 * más de uno -- p. ej. Plus y Pro) para suscribirse -- nada de nombre/
 * límite/precio está hardcodeado acá, todo sale del backend para poder
 * ajustarlo sin subir versión nueva. El checkout redirige al proveedor de
 * pago (Wompi); al pagar vuelve a `/placed-order`, que espera
 * la confirmación del webhook, y si cancela vuelve acá (`/pro`).
 */
export default function ProScreen() {
  const colors = useColors();
  const myPlan = useMyPlan();
  const plansQuery = usePlans();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();
  const redeem = useRedeemPromoCode();
  const startTrial = useStartTrial();

  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);
  const [pendingTrialPlanId, setPendingTrialPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  const currentPlan = myPlan.data?.plan;
  // Cualquier plan que no sea el default (gratis) cuenta como "pago", sin
  // asumir que el único pago se llama "pro" -- puede haber varios tiers.
  const isPaid = currentPlan != null && !currentPlan.is_default;
  const paidPlans = [...(plansQuery.data ?? [])]
    .filter((p) => !p.is_default)
    .sort((a, b) => cheapestActivePrice(a) - cheapestActivePrice(b));

  async function onSubscribe(price: PlanPrice) {
    setError(null);
    setPendingPriceId(price.id);
    try {
      // Pagó: `/placed-order` espera la confirmación. Canceló: vuelve a Pro.
      const { checkout_url } = await checkout.mutateAsync({
        plan_price: price.id,
        success_url: ExpoLinking.createURL('/placed-order'),
        cancel_url: ExpoLinking.createURL('/pro'),
      });
      await Linking.openURL(checkout_url);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo iniciar el pago.'));
    } finally {
      setPendingPriceId(null);
    }
  }

  async function onStartTrial(plan: Plan) {
    setError(null);
    setPendingTrialPlanId(plan.id);
    try {
      await startTrial.mutateAsync(plan.id);
      haptics.success();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo empezar la prueba.'));
    } finally {
      setPendingTrialPlanId(null);
    }
  }

  async function onRedeem() {
    const code = promoCode.trim();
    if (!code) return;
    setPromoError(null);
    try {
      const subscription = await redeem.mutateAsync(code);
      haptics.success();
      setPromoCode('');
      setPromoSuccess(`¡Listo! Ya tenés ${subscription.plan.name}.`);
    } catch (err) {
      haptics.error();
      setPromoError(errorMessage(err, 'No se pudo canjear el código.'));
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
                  style={{ backgroundColor: isPaid ? colors.primary : colors.surface2 }}
                >
                  <Icon name="star" size={18} color={isPaid ? '#FFFFFF' : colors.textMuted} />
                </View>
                <View className="flex-1">
                  <Text className="text-text text-base" style={{ fontFamily: fonts.bold }}>
                    {isPaid ? `Tenés ${currentPlan!.name}` : 'Estás en el plan Gratis'}
                  </Text>
                  <Text className="text-text-muted text-xs">
                    {isPaid
                      ? myPlan.data?.subscription?.current_period_end
                        ? `Renueva el ${new Date(
                            myPlan.data.subscription.current_period_end,
                          ).toLocaleDateString('es')}`
                        : 'Sin fecha de vencimiento'
                      : limitsSummary(currentPlan)}
                  </Text>
                </View>
              </View>
            </Card>

            {isPaid ? (
              <Card title="Tu suscripción">
                <View className="mb-3 gap-0.5">
                  <DetailRow label="Plan" value={currentPlan!.name} />
                  {myPlan.data?.subscription ? (
                    <>
                      <DetailRow
                        label="Estado"
                        value={subscriptionStatusLabel(myPlan.data.subscription)}
                      />
                      <DetailRow
                        label="Método"
                        value={subscriptionMethodLabel(myPlan.data.subscription)}
                      />
                      {myPlan.data.subscription.billing_period ? (
                        <DetailRow
                          label="Facturación"
                          value={PERIOD_LABEL[myPlan.data.subscription.billing_period]}
                        />
                      ) : null}
                      <DetailRow
                        label="Desde"
                        value={formatLongDateTime(myPlan.data.subscription.created_at)}
                      />
                      <DetailRow
                        label={myPlan.data.subscription.canceled_at ? 'Vencía' : 'Vence'}
                        value={
                          myPlan.data.subscription.current_period_end
                            ? formatLongDateTime(myPlan.data.subscription.current_period_end)
                            : 'Sin fecha de vencimiento'
                        }
                      />
                      {myPlan.data.subscription.canceled_at ? (
                        <DetailRow
                          label="Cancelada el"
                          value={formatLongDateTime(myPlan.data.subscription.canceled_at)}
                        />
                      ) : null}
                    </>
                  ) : null}
                </View>

                {myPlan.data?.subscription?.canceled_at ? null : confirmCancel ? (
                  <View className="gap-3">
                    <Text className="text-text-muted text-sm leading-5">
                      ¿Cancelar tu suscripción {currentPlan!.name}? Seguís teniendo acceso hasta
                      que termine el período ya pagado.
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
                {plansQuery.isLoading ? (
                  <Card title="Elegí tu plan">
                    <LoadingState />
                  </Card>
                ) : paidPlans.length === 0 ? (
                  <Card title="Elegí tu plan">
                    <Text className="text-text-muted text-sm">
                      Todavía no hay planes configurados.
                    </Text>
                  </Card>
                ) : (
                  paidPlans.map((plan) => {
                    const planFeatures = Object.keys(plan.features ?? {}).filter(
                      (key) => plan.features[key],
                    );
                    const planPrices = (plan.prices ?? []).filter((p) => p.is_active);
                    return (
                      <Card key={plan.id} title={plan.name}>
                        {planFeatures.length > 0 ? (
                          <View className="mb-3 gap-2.5">
                            {planFeatures.map((key) => (
                              <View key={key} className="flex-row items-center gap-2">
                                <Icon name="check" size={14} color={colors.income} />
                                <Text className="text-text-muted flex-1 text-sm">
                                  {FEATURE_LABEL[key as FeatureKey] ?? key}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        {plan.trial_days ? (
                          <View className="mb-2">
                            <Button
                              label={`Probar gratis ${plan.trial_days} día${
                                plan.trial_days === 1 ? '' : 's'
                              }`}
                              variant="ghost"
                              loading={pendingTrialPlanId === plan.id}
                              disabled={startTrial.isPending}
                              onPress={() => onStartTrial(plan)}
                            />
                          </View>
                        ) : null}
                        {planPrices.length === 0 ? (
                          <Text className="text-text-muted text-sm">
                            Todavía no hay precios configurados.
                          </Text>
                        ) : (
                          <View className="gap-2">
                            {planPrices.map((price) => (
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
                      </Card>
                    );
                  })
                )}
                {error ? <Text className="text-expense px-2 text-xs">{error}</Text> : null}

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

                <Card title="¿Tenés un código de invitación?">
                  <View className="gap-3">
                    <TextField
                      label="Código"
                      placeholder="p. ej. BETA2026"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      value={promoCode}
                      onChangeText={(t) => {
                        setPromoCode(t);
                        if (promoError) setPromoError(null);
                        if (promoSuccess) setPromoSuccess(null);
                      }}
                    />
                    {promoError ? <Text className="text-expense text-xs">{promoError}</Text> : null}
                    {promoSuccess ? (
                      <Text className="text-income text-xs">{promoSuccess}</Text>
                    ) : (
                      <Button
                        label="Canjear"
                        variant="ghost"
                        loading={redeem.isPending}
                        disabled={!promoCode.trim()}
                        onPress={onRedeem}
                      />
                    )}
                  </View>
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
