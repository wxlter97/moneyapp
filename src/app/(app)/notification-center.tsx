import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/api/queries';
import type { AppNotification, NotificationKind } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { formatDateTime } from '@/lib/date';
import { routeForNotification } from '@/lib/notificationRouting';
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
  insight: 'trending',
};

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

  const notifications = query.data ?? [];
  const hasUnread = notifications.some((n) => n.status === 'unread');

  function onPressNotification(n: AppNotification) {
    haptics.tap();
    if (n.status === 'unread') markRead.mutate(n.id);
    if (typeof n.data.workspace === 'string') setActiveId(n.data.workspace);
    router.push(routeForNotification(n.data));
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
              return (
                <View key={n.id}>
                  {i > 0 ? <View className="h-px bg-border/30" /> : null}
                  <Pressable
                    onPress={() => onPressNotification(n)}
                    accessibilityRole="button"
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
                        numberOfLines={1}
                      >
                        {n.title}
                      </Text>
                      <Text className="text-text-muted text-xs" numberOfLines={2}>
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
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
