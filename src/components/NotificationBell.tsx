import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { useUnreadNotificationCount } from '@/api/queries';
import { IconButton } from './ui/IconButton';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * Campanita del header con el contador de notificaciones sin leer -- lleva
 * a `(app)/notification-center.tsx`. Antes de esto, avisos como una
 * invitación pendiente o un correo bancario por revisar sólo se veían
 * entrando a su propia pantalla, sin ningún lugar central para enterarse.
 */
export function NotificationBell() {
  const colors = useColors();
  const { data: count } = useUnreadNotificationCount();
  const hasUnread = !!count && count > 0;

  return (
    <View className="relative">
      <IconButton
        icon="bell"
        size={32}
        iconSize={16}
        color={colors.textMuted}
        onPress={() => router.push('/notification-center')}
        accessibilityLabel={hasUnread ? `Notificaciones, ${count} sin leer` : 'Notificaciones'}
        className="rounded-full bg-surface-2 active:opacity-60"
      />
      {hasUnread ? (
        <View
          pointerEvents="none"
          className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-expense px-1"
        >
          <Text className="text-[10px] leading-3 text-white" style={{ fontFamily: fonts.bold }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
