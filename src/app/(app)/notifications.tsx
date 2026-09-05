import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
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

  useEffect(() => {
    checkPermission();
  }, []);

  async function checkPermission() {
    const settings = await Notifications.getPermissionsAsync().catch(() => null);
    setPermission(settings ? (settings.granted ? 'granted' : 'denied') : 'unsupported');
  }

  async function onEnable() {
    setEnabling(true);
    try {
      const device = await registerForPushNotificationsAsync();
      if (device) {
        await pushDevices.register(device.token, device.platform);
        haptics.success();
      }
    } finally {
      setEnabling(false);
      checkPermission();
    }
  }

  async function onToggle(field: 'remind_recurring' | 'remind_installments' | 'warn_budget', value: boolean) {
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
              <View className="mt-3">
                <Button label="Activar avisos" loading={enabling} onPress={onEnable} />
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
