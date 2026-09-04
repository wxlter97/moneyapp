import { Pressable, Text, View } from 'react-native';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { Icon } from './ui/Icon';
import { haptics } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';

interface ScreenHeaderProps {
  /** Título grande estilo HIG (large title), debajo de la fila del workspace. */
  title?: string;
  /** `light` cuando va sobre un degradado de sección. */
  tone?: 'light' | 'default';
}

/** Cabecera común: selector de workspace + acción de salir + título grande opcional. */
export function ScreenHeader({ title, tone = 'default' }: ScreenHeaderProps) {
  const signOut = useAuthStore((s) => s.signOut);
  const iconColor = tone === 'light' ? '#FFFFFF' : '#9AA4B2';

  return (
    <View className="gap-1 pb-2 pt-1">
      <View className="flex-row items-start justify-between">
        <WorkspaceSwitcher tone={tone} />
        <Pressable
          onPress={() => {
            haptics.tap();
            signOut();
          }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          className={`h-8 w-8 items-center justify-center rounded-full active:opacity-60 ${
            tone === 'light' ? 'bg-white/15' : 'bg-surface-2'
          }`}
        >
          <Icon name="sign-out" size={16} color={iconColor} />
        </Pressable>
      </View>
      {title ? (
        <Text
          className={`text-3xl font-bold ${tone === 'light' ? 'text-white' : 'text-text'}`}
        >
          {title}
        </Text>
      ) : null}
    </View>
  );
}
