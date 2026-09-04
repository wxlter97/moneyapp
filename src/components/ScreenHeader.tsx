import { Pressable, Text, View } from 'react-native';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { Icon } from './ui/Icon';
import { haptics } from '@/lib/haptics';
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
        <Pressable
          onPress={() => {
            haptics.tap();
            signOut();
          }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-2 active:opacity-60"
        >
          <Icon name="sign-out" size={16} color={colors.textMuted} />
        </Pressable>
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
