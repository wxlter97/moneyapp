import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/api/queries';
import * as res from '@/api/resources';
import type { AppNotification, NotificationKind } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { formatDateTime, todayISO } from '@/lib/date';
import { actionsForNotification, type NotificationAction } from '@/lib/notificationRouting';
import { newTransactionHref, transferToHref } from '@/lib/prefill';
import { useWorkspaceStore } from '@/store/workspace';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const KIND_ICON: Record<NotificationKind, IconName> = {
  invitation: 'mail',
  email_import_pending: 'inbox',
  recurring_due: 'repeat',
  installment_due: 'receipt',
  budget_threshold: 'bars',
  low_balance: 'card',
  statement_due: 'card',
  statement_closed: 'receipt',
  statement_overdue: 'alert',
  insight: 'trending',
  monthly_summary: 'trending',
  subscription_renewal_due: 'gift',
  subscription_expired: 'gift',
};

/** Resuelve las acciones que necesitan datos del servidor (ver
 * `NotificationAction`) y devuelve a dónde ir. Corre DESPUÉS de cambiar al
 * workspace de la notificación: el cliente HTTP manda `X-Workspace-ID` del
 * workspace activo, así que la regla/las carteras salen del correcto. */
async function hrefForAction(action: NotificationAction): Promise<Href> {
  switch (action.kind) {
    case 'route':
      return action.href;
    case 'record-recurring': {
      const r = await res.recurringExpenses.get(action.recurringId);
      return newTransactionHref({
        prefillType: r.type,
        prefillWallet: r.wallet,
        prefillToWallet: r.to_wallet,
        prefillCategory: r.category,
        prefillAmount: r.amount,
        prefillDate: r.next_due_date,
        prefillNote: r.name,
        prefillRecurringId: r.id,
      });
    }
    case 'transfer-to':
      return transferToHref(await res.wallets.list(), action.walletId, {
        amount: action.amount,
        note: action.note,
        date: todayISO(),
      });
  }
}

/**
 * Herramientas → campanita del header → Notificaciones: historial completo
 * (recordatorios que de verdad se mandaron, invitaciones, correos bancarios
 * por revisar), no sólo lo pendiente -- ver `apps.notifications` del
 * backend. Antes cada una de estas cosas sólo se veía entrando a su propia
 * pantalla; ésta es el lugar central que faltaba.
 */
export default function NotificationCenterScreen() {
  const colors = useColors();
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Tocar una notificación la abre en el lugar (texto completo + sus
  // acciones) en vez de navegar de una: el texto se cortaba a una/dos
  // líneas y la única "acción" era saltar a otra pantalla.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const notifications = query.data ?? [];
  const hasUnread = notifications.some((n) => n.status === 'unread');

  function onPressNotification(n: AppNotification) {
    haptics.tap();
    setActionError(null);
    if (n.status === 'unread') markRead.mutate(n.id);
    setExpandedId((cur) => (cur === n.id ? null : n.id));
  }

  async function onAction(n: AppNotification, action: NotificationAction, key: string) {
    haptics.tap();
    setActionError(null);
    if (typeof n.data.workspace === 'string') setActiveId(n.data.workspace);
    setRunningAction(key);
    try {
      router.push(await hrefForAction(action));
    } catch {
      haptics.error();
      // Lo más probable: la regla/cartera ya no existe (se borró después
      // del aviso).
      setActionError('No se pudo abrir. Puede que ya no exista.');
    } finally {
      setRunningAction(null);
    }
  }

  async function onMarkAllRead() {
    haptics.tap();
    try {
      await markAllRead.mutateAsync();
    } catch {
      haptics.error();
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader
        title="Notificaciones"
        right={
          hasUnread ? (
            <Pressable
              onPress={onMarkAllRead}
              disabled={markAllRead.isPending}
              accessibilityRole="button"
              className="active:opacity-60"
            >
              <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                Marcar todas leídas
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerClassName="gap-4 py-2">
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : notifications.length === 0 ? (
          <EmptyState title="Sin notificaciones" hint="Acá vas a ver tus avisos cuando lleguen." />
        ) : (
          <Card>
            {notifications.map((n, i) => {
              const isUnread = n.status === 'unread';
              const isExpanded = expandedId === n.id;
              return (
                <View key={n.id}>
                  {i > 0 ? <View className="h-px bg-border/30" /> : null}
                  <Pressable
                    onPress={() => onPressNotification(n)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    className="flex-row items-start gap-3 py-3 active:opacity-70"
                  >
                    <View
                      className="mt-0.5 h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: isUnread ? colors.primary : colors.surface2 }}
                    >
                      <Icon
                        name={KIND_ICON[n.kind] ?? 'bell'}
                        size={15}
                        color={isUnread ? '#FFFFFF' : colors.textMuted}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-text text-sm"
                        style={{ fontFamily: isUnread ? fonts.bold : fonts.semibold }}
                        numberOfLines={isExpanded ? undefined : 1}
                      >
                        {n.title}
                      </Text>
                      <Text
                        className={isExpanded ? 'text-text text-sm' : 'text-text-muted text-xs'}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {n.body}
                      </Text>
                      <Text className="text-text-muted mt-0.5 text-[11px]">
                        {formatDateTime(n.created_at)}
                        {n.status === 'resolved' ? ' · resuelta' : ''}
                      </Text>
                    </View>
                    {isUnread ? (
                      <View
                        className="mt-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: colors.primary }}
                      />
                    ) : (
                      <View className="mt-1">
                        <Icon
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={colors.textMuted}
                        />
                      </View>
                    )}
                  </Pressable>
                  {isExpanded ? (
                    <View className="gap-2 pb-3 pl-12">
                      <View className="flex-row flex-wrap gap-2">
                        {actionsForNotification(n.data).map((action, idx) => {
                          const key = `${n.id}:${idx}`;
                          const primary = idx === 0 && n.status !== 'resolved';
                          const busy = runningAction === key;
                          return (
                            <Pressable
                              key={key}
                              onPress={() => onAction(n, action, key)}
                              disabled={runningAction != null}
                              accessibilityRole="button"
                              className={`h-9 flex-row items-center justify-center rounded-full px-4 active:opacity-70 ${
                                primary ? '' : 'border border-border'
                              }`}
                              style={primary ? { backgroundColor: colors.primary } : undefined}
                            >
                              {busy ? (
                                <ActivityIndicator
                                  size="small"
                                  color={primary ? colors.primaryFg : colors.text}
                                />
                              ) : (
                                <Text
                                  className="text-sm"
                                  style={{
                                    fontFamily: fonts.semibold,
                                    color: primary ? colors.primaryFg : colors.text,
                                  }}
                                >
                                  {action.label}
                                </Text>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                      {actionError ? (
                        <Text className="text-expense text-xs">{actionError}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
