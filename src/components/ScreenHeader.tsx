import { Pressable, Text, View } from 'react-native';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useAuthStore } from '@/store/auth';

interface ScreenHeaderProps {
  title?: string;
}

/** Cabecera común: selector de workspace + acción de salir. */
export function ScreenHeader({ title }: ScreenHeaderProps) {
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <View className="gap-1 pb-2 pt-1">
      <View className="flex-row items-start justify-between">
        <WorkspaceSwitcher />
        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          className="py-0.5 active:opacity-60"
        >
          <Text className="text-text-muted text-sm">Salir</Text>
        </Pressable>
      </View>
      {title ? <Text className="text-text-muted text-sm">{title}</Text> : null}
    </View>
  );
}
