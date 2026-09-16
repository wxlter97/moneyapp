import { Text, View } from 'react-native';

import { NotificationBell } from './NotificationBell';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { IconButton } from './ui/IconButton';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface ScreenHeaderProps {
  /** Título grande de página (para pantallas sin cifra hero, ej. Herramientas). */
  title?: string;
}

/** Cabecera común: selector de workspace + acción de salir + título grande opcional. */
export function ScreenHeader({ title }: ScreenHeaderProps) {
  const colors = useColors();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <View className="gap-1 pb-2 pt-1">
      <View className="flex-row items-start justify-between">
        <WorkspaceSwitcher />
        <View className="flex-row items-center gap-2">
          <NotificationBell />
          <IconButton
            icon="sign-out"
            size={32}
            iconSize={16}
            color={colors.textMuted}
            onPress={signOut}
            accessibilityLabel="Cerrar sesión"
            className="rounded-full bg-surface-2 active:opacity-60"
          />
        </View>
      </View>
      {title ? (
        <Text
          className="text-text text-[34px] leading-[38px]"
          style={{ fontFamily: fonts.extrabold, letterSpacing: -0.5 }}
        >
          {title}
        </Text>
      ) : null}
    </View>
  );
}
