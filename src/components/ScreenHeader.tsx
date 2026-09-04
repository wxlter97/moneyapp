import { Pressable, Text, View } from 'react-native';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useAuthStore } from '@/store/auth';

interface ScreenHeaderProps {
  title?: string;
  /** `light` cuando va sobre un degradado de sección. */
  tone?: 'light' | 'default';
}

/** Cabecera común: selector de workspace + acción de salir. */
export function ScreenHeader({ title, tone = 'default' }: ScreenHeaderProps) {
  const signOut = useAuthStore((s) => s.signOut);
  const muted = tone === 'light' ? 'text-white/80' : 'text-text-muted';

  return (
    <View className="gap-1 pb-2 pt-1">
      <View className="flex-row items-start justify-between">
        <WorkspaceSwitcher tone={tone} />
        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          className="py-0.5 active:opacity-60"
        >
          <Text className={`${muted} text-sm`}>Salir</Text>
        </Pressable>
      </View>
      {title ? <Text className={`${muted} text-sm`}>{title}</Text> : null}
    </View>
  );
}
