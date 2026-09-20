import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { pushDevices } from '@/api/resources';
import { disablePush, getPushStatus, revalidatePush, type PushStatus } from '@/lib/notifications';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * Herramientas → Notificaciones: qué recordatorios push mandar (recurrentes
 * y cuotas por vencer, presupuesto por agotarse) y el estado del permiso del
 * sistema. El registro del dispositivo en sí pasa solo al iniciar sesión
 * (ver `(app)/_layout.tsx`); acá sólo hace falta si el usuario había dicho
 * que no antes y cambia de opinión.
 */
export default function NotificationsScreen() {
  const colors = useColors();
  const prefsQ = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState<'revalidate' | 'disable' | 'test' | null>(null);
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // iOS/Android no dejan volver a pedir el permiso una vez que el usuario ya
  // dijo que no: `requestPermissionsAsync` simplemente no hace nada. Sin
  // esto, tocar "Activar avisos" en ese caso parecía no hacer nada.
  const [needsSystemSettings, setNeedsSystemSettings] = useState(false);

  useEffect(() => {
    refreshStatus();
  }, []);

  async function refreshStatus() {
    setStatus(await getPushStatus());
  }

  /** Vuelve a registrar este dispositivo desde cero (y los enciende si estaban
   * apagados): lo que hay que hacer cuando los avisos dejaron de llegar. */
  async function onRevalidate() {
    setBusy('revalidate');
    setNeedsSystemSettings(false);
    setDeviceMessage(null);
    try {
      const device = await revalidatePush();
      if (device) {
        haptics.success();
        setDeviceMessage('Listo: este dispositivo quedó registrado de nuevo.');
      } else {
        // Si seguimos sin permiso después de pedirlo, es porque el sistema
        // ya no vuelve a preguntar (el usuario dijo que no antes): hay que
        // ir a Ajustes a mano.
        const settings = await Notifications.getPermissionsAsync().catch(() => null);
        if (settings && !settings.granted && !settings.canAskAgain) setNeedsSystemSettings(true);
        setDeviceMessage('No se pudo registrar: falta el permiso de notificaciones.');
      }
    } catch (err) {
      haptics.error();
      setDeviceMessage(errorMessage(err, 'No se pudo registrar este dispositivo.'));
    } finally {
      setBusy(null);
      refreshStatus();
    }
  }

  async function onDisable() {
    setBusy('disable');
    setDeviceMessage(null);
    try {
      await disablePush();
      haptics.selection();
      setDeviceMessage('Avisos apagados en este dispositivo.');
    } finally {
      setBusy(null);
      refreshStatus();
    }
  }

  /** Manda un aviso real a todos los dispositivos de la cuenta y cuenta qué pasó:
   * separa "el servidor no pudo enviarlo" de "salió bien" (si aun así no se ve,
   * el problema está en este dispositivo: revalidar). */
  async function onTest() {
    setBusy('test');
    setDeviceMessage(null);
    try {
      const { devices, results } = await pushDevices.test();
      if (devices === 0) {
        setDeviceMessage('La cuenta no tiene ningún dispositivo registrado: usá "Revalidar".');
      } else {
        const failed = results.filter((r) => !r.ok);
        setDeviceMessage(
          failed.length === 0
            ? `Enviado a ${devices} dispositivo(s). Si no te llega, usá "Revalidar".`
            : failed.map((r) => r.detail).join(' · '),
        );
      }
    } catch (err) {
      setDeviceMessage(errorMessage(err, 'No se pudo enviar el aviso de prueba.'));
    } finally {
      setBusy(null);
      refreshStatus();
    }
  }

  async function onToggle(
    field:
      | 'remind_recurring'
      | 'remind_installments'
      | 'warn_budget'
      | 'remind_low_balance'
      | 'warn_statement_due'
      | 'warn_insights',
    value: boolean,
  ) {
    setSaveError(null);
    try {
      await update.mutateAsync({ [field]: value });
    } catch (err) {
      haptics.error();
      setSaveError(errorMessage(err, 'No se pudo guardar.'));
    }
  }

  async function onThresholdChange(next: number) {
    const clamped = Math.min(100, Math.max(50, next));
    setSaveError(null);
    try {
      await update.mutateAsync({ budget_threshold_pct: clamped });
      haptics.selection();
    } catch (err) {
      haptics.error();
      setSaveError(errorMessage(err, 'No se pudo guardar.'));
    }
  }

  async function onStatementDaysChange(next: number) {
    const clamped = Math.min(14, Math.max(1, next));
    setSaveError(null);
    try {
      await update.mutateAsync({ statement_due_days_before: clamped });
      haptics.selection();
    } catch (err) {
      haptics.error();
      setSaveError(errorMessage(err, 'No se pudo guardar.'));
    }
  }

  const prefs = prefsQ.data;

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Notificaciones" />

      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        <DeviceCard
          status={status}
          busy={busy}
          message={deviceMessage}
          needsSystemSettings={needsSystemSettings}
          onRevalidate={onRevalidate}
          onDisable={onDisable}
          onTest={onTest}
        />

        {prefsQ.isLoading ? (
          <LoadingState />
        ) : prefsQ.isError ? (
          <ErrorState error={prefsQ.error} onRetry={prefsQ.refetch} />
        ) : prefs ? (
          <>
            <Card title="Qué avisar">
              <ToggleRow
                title="Gastos recurrentes"
                hint="Un día antes de que venza."
                value={prefs.remind_recurring}
                onChange={(v) => onToggle('remind_recurring', v)}
              />
              <View className="h-px bg-border/30" />
              <ToggleRow
                title="Cuotas de compras a plazo"
                hint="Un día antes de que venza."
                value={prefs.remind_installments}
                onChange={(v) => onToggle('remind_installments', v)}
              />
              <View className="h-px bg-border/30" />
              <ToggleRow
                title="Presupuesto por agotarse"
                hint="Cuando una categoría cruza el umbral de abajo."
                value={prefs.warn_budget}
                onChange={(v) => onToggle('warn_budget', v)}
              />
              <View className="h-px bg-border/30" />
              <ToggleRow
                title="Saldo bajo"
                hint="Cuando una cartera cae por debajo de su umbral (se fija al editarla)."
                value={prefs.remind_low_balance}
                onChange={(v) => onToggle('remind_low_balance', v)}
              />
              <View className="h-px bg-border/30" />
              <ToggleRow
                title="Estado de cuenta por vencer"
                hint="El pago de contado completo, no cuota por cuota."
                value={prefs.warn_statement_due}
                onChange={(v) => onToggle('warn_statement_due', v)}
              />
              <View className="h-px bg-border/30" />
              <ToggleRow
                title="Patrones de gasto"
                hint="Fin de semana, después de cobrar, gasto hormiga, día pico, categorías en alza."
                value={prefs.warn_insights}
                onChange={(v) => onToggle('warn_insights', v)}
              />
            </Card>

            {prefs.warn_budget ? (
              <Card title="Umbral de presupuesto">
                <View className="flex-row items-center justify-between">
                  <Text className="text-text-muted flex-1 pr-2 text-sm">
                    Avisar cuando se use el {prefs.budget_threshold_pct}% o más del presupuesto de
                    una categoría.
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => onThresholdChange(prefs.budget_threshold_pct - 5)}
                      disabled={prefs.budget_threshold_pct <= 50}
                      className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-70 disabled:opacity-40"
                      accessibilityRole="button"
                      accessibilityLabel="Bajar umbral"
                    >
                      <Text className="text-text text-lg" style={{ fontFamily: fonts.semibold }}>
                        −
                      </Text>
                    </Pressable>
                    <Text
                      className="text-text w-10 text-center text-base"
                      style={{ fontFamily: fonts.semibold }}
                    >
                      {prefs.budget_threshold_pct}%
                    </Text>
                    <IconButton
                      icon="plus"
                      size={36}
                      iconSize={16}
                      color={colors.text}
                      onPress={() => onThresholdChange(prefs.budget_threshold_pct + 5)}
                      disabled={prefs.budget_threshold_pct >= 100}
                      accessibilityLabel="Subir umbral"
                      className="rounded-full bg-surface-2 active:opacity-70"
                    />
                  </View>
                </View>
              </Card>
            ) : null}

            {prefs.warn_statement_due ? (
              <Card title="Anticipación del estado de cuenta">
                <View className="flex-row items-center justify-between">
                  <Text className="text-text-muted flex-1 pr-2 text-sm">
                    Avisar {prefs.statement_due_days_before}{' '}
                    {prefs.statement_due_days_before === 1 ? 'día' : 'días'} antes de que venza el
                    pago.
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => onStatementDaysChange(prefs.statement_due_days_before - 1)}
                      disabled={prefs.statement_due_days_before <= 1}
                      className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-70 disabled:opacity-40"
                      accessibilityRole="button"
                      accessibilityLabel="Bajar días de anticipación"
                    >
                      <Text className="text-text text-lg" style={{ fontFamily: fonts.semibold }}>
                        −
                      </Text>
                    </Pressable>
                    <Text
                      className="text-text w-10 text-center text-base"
                      style={{ fontFamily: fonts.semibold }}
                    >
                      {prefs.statement_due_days_before}d
                    </Text>
                    <IconButton
                      icon="plus"
                      size={36}
                      iconSize={16}
                      color={colors.text}
                      onPress={() => onStatementDaysChange(prefs.statement_due_days_before + 1)}
                      disabled={prefs.statement_due_days_before >= 14}
                      accessibilityLabel="Subir días de anticipación"
                      className="rounded-full bg-surface-2 active:opacity-70"
                    />
                  </View>
                </View>
              </Card>
            ) : null}

            {saveError ? <Text className="text-expense px-1 text-xs">{saveError}</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ToggleRow({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View className="flex-row items-center justify-between py-2.5">
      <View className="flex-1 pr-3">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          {title}
        </Text>
        <Text className="text-text-muted text-xs">{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptics.selection();
          onChange(v);
        }}
        trackColor={{ true: colors.primary, false: colors.surface2 }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function DeviceCard({
  status,
  busy,
  message,
  needsSystemSettings,
  onRevalidate,
  onDisable,
  onTest,
}: {
  status: PushStatus | null;
  busy: 'revalidate' | 'disable' | 'test' | null;
  message: string | null;
  needsSystemSettings: boolean;
  onRevalidate: () => void;
  onDisable: () => void;
  onTest: () => void;
}) {
  const colors = useColors();
  if (!status) return null;

  const active = status.enabled && status.permission === 'granted' && status.subscribed;
  const unsupported = status.permission === 'unsupported';
  let title: string;
  let hint: string;
  if (unsupported) {
    title = 'No disponible en este dispositivo';
    hint =
      'Probá desde un iPhone/Android real (no un simulador) o desde un navegador con soporte de notificaciones. En iPhone tiene que estar instalada en la pantalla de inicio.';
  } else if (!status.enabled) {
    title = 'Apagados en este dispositivo';
    hint = 'No vas a recibir avisos aquí. Los del centro de notificaciones siguen apareciendo en la app.';
  } else if (status.permission === 'denied') {
    title = 'El permiso está bloqueado';
    hint = 'El sistema no vuelve a preguntar: activalo desde Ajustes → Notificaciones.';
  } else if (status.permission !== 'granted') {
    title = 'Los avisos están desactivados';
    hint = 'Dale permiso para poder avisarte de recurrentes, cuotas y presupuesto.';
  } else if (!status.subscribed) {
    title = 'Este dispositivo no está registrado';
    hint = 'El permiso está concedido pero no hay una suscripción viva: revalidá para registrarlo de nuevo.';
  } else {
    title = 'Activos en este dispositivo';
    hint = 'Si dejaron de llegar, revalidá: vuelve a registrar este dispositivo desde cero.';
  }

  return (
    <Card title="Este dispositivo">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
          <Icon name="bell" size={16} color={active ? colors.primary : colors.textMuted} />
        </View>
        <View className="flex-1">
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            {title}
          </Text>
          <Text className="text-text-muted text-xs">{hint}</Text>
        </View>
      </View>

      {!unsupported ? (
        <View className="mt-3 gap-2">
          {needsSystemSettings || status.permission === 'denied' ? (
            <Button label="Abrir Ajustes" onPress={() => Linking.openSettings()} />
          ) : (
            <Button
              label={status.enabled ? 'Revalidar avisos' : 'Activar avisos'}
              loading={busy === 'revalidate'}
              disabled={busy !== null}
              onPress={onRevalidate}
            />
          )}
          {active ? (
            <>
              <Button
                label="Enviar aviso de prueba"
                variant="ghost"
                loading={busy === 'test'}
                disabled={busy !== null}
                onPress={onTest}
              />
              <Button
                label="Apagar en este dispositivo"
                variant="ghost"
                loading={busy === 'disable'}
                disabled={busy !== null}
                onPress={onDisable}
              />
            </>
          ) : null}
        </View>
      ) : null}
      {message ? <Text className="text-text-muted mt-2 text-xs">{message}</Text> : null}
    </Card>
  );
}
