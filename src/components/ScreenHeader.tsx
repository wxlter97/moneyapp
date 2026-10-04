import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { NotificationBell } from './NotificationBell';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { IconButton } from './ui/IconButton';
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
  // Confirmación en línea (Alert.alert no existe en web): un toque accidental
  // en el ícono sacaba la sesión sin preguntar.
  const [confirming, setConfirming] = useState(false);

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
            onPress={() => {
              haptics.tap();
              setConfirming((c) => !c);
            }}
            accessibilityLabel="Cerrar sesión"
            className="rounded-full bg-surface-2 active:opacity-60"
          />
        </View>
      </View>
      {confirming ? (
        <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
          <Text className="text-text flex-1 text-sm">¿Cerrar sesión?</Text>
          <Pressable
            onPress={() => setConfirming(false)}
            accessibilityRole="button"
            className="rounded-lg border border-border px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-text-muted text-sm">Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={signOut}
            accessibilityRole="button"
            className="rounded-lg bg-primary px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-primary-fg text-sm font-semibold">Cerrar sesión</Text>
          </Pressable>
        </View>
      ) : null}
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
