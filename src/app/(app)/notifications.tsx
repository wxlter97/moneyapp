import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import { haptics } from '@/lib/haptics';
import { pushDevices } from '@/api/resources';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

type PermissionState = 'checking' | 'granted' | 'denied' | 'unsupported';

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
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [enabling, setEnabling] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // iOS/Android no dejan volver a pedir el permiso una vez que el usuario ya
  // dijo que no: `requestPermissionsAsync` simplemente no hace nada. Sin
  // esto, tocar "Activar avisos" en ese caso parecía no hacer nada.
  const [needsSystemSettings, setNeedsSystemSettings] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  async function checkPermission() {
    const settings = await Notifications.getPermissionsAsync().catch(() => null);
    setPermission(settings ? (settings.granted ? 'granted' : 'denied') : 'unsupported');
  }

  async function onEnable() {
    setEnabling(true);
    setNeedsSystemSettings(false);
    try {
      const device = await registerForPushNotificationsAsync();
      if (device) {
        await pushDevices.register(device.token, device.platform);
        haptics.success();
      } else {
        // Si seguimos sin permiso después de pedirlo, es porque el sistema
        // ya no vuelve a preguntar (el usuario dijo que no antes): hay que
        // ir a Ajustes a mano.
        const settings = await Notifications.getPermissionsAsync().catch(() => null);
        if (settings && !settings.granted && !settings.canAskAgain) {
          setNeedsSystemSettings(true);
        }
      }
    } finally {
      setEnabling(false);
      checkPermission();
    }
  }

  async function onToggle(
    field: 'remind_recurring' | 'remind_installments' | 'warn_budget' | 'remind_low_balance' | 'warn_statement_due',
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
        {permission !== 'granted' ? (
          <Card>
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                <Icon name="bell" size={16} color={colors.textMuted} />
              </View>
              <View className="flex-1">
                <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                  {permission === 'unsupported'
                    ? 'No disponible en este dispositivo'
                    : 'Los avisos están desactivados'}
                </Text>
                <Text className="text-text-muted text-xs">
                  {permission === 'unsupported'
                    ? 'Probá desde un iPhone/Android real (no un simulador ni la web).'
                    : 'Dale permiso para poder avisarte de recurrentes, cuotas y presupuesto.'}
                </Text>
              </View>
            </View>
            {permission === 'denied' ? (
              <View className="mt-3 gap-2">
                <Button
                  label="Activar avisos"
                  loading={enabling}
                  onPress={needsSystemSettings ? () => Linking.openSettings() : onEnable}
                />
                {needsSystemSettings ? (
                  <Text className="text-text-muted text-center text-xs">
                    Ya lo habías rechazado antes: el sistema no vuelve a preguntar. Activalo
                    desde Ajustes → Notificaciones.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Card>
        ) : null}

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
                    <Pressable
                      onPress={() => onThresholdChange(prefs.budget_threshold_pct + 5)}
                      disabled={prefs.budget_threshold_pct >= 100}
                      className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-70 disabled:opacity-40"
                      accessibilityRole="button"
                      accessibilityLabel="Subir umbral"
                    >
                      <Icon name="plus" size={16} color={colors.text} />
                    </Pressable>
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
                    <Pressable
                      onPress={() => onStatementDaysChange(prefs.statement_due_days_before + 1)}
                      disabled={prefs.statement_due_days_before >= 14}
                      className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-70 disabled:opacity-40"
                      accessibilityRole="button"
                      accessibilityLabel="Subir días de anticipación"
                    >
                      <Icon name="plus" size={16} color={colors.text} />
                    </Pressable>
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
