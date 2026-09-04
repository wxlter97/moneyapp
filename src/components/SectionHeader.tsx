import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { sections, type SectionKey } from '@/theme';
import { FadeInView } from './ui/FadeInView';
import { ScreenHeader } from './ScreenHeader';

interface SectionHeaderProps {
  section: SectionKey;
  /** Título grande. Por defecto el nombre de la sección. */
  title?: string;
  /** Contenido bajo el título (una cifra, un mes…). */
  subtitle?: ReactNode;
  /** Acción alineada a la derecha del título. */
  right?: ReactNode;
  /** Subtabs u otro contenido al pie del degradado. */
  children?: ReactNode;
}

/**
 * Cabecera de sección estilo Buddy: banda con degradado (púrpura / verde /
 * rosa según la sección) que cubre el área segura superior. El contenido de
 * la pantalla va debajo, en un `ScrollView` normal sobre el fondo del tema.
 */
export function SectionHeader({
  section,
  title,
  subtitle,
  right,
  children,
}: SectionHeaderProps) {
  const insets = useSafeAreaInsets();
  const s = sections[section];

  return (
    <LinearGradient
      colors={[s.gradient[0], s.gradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 14 }}
    >
      <View className="w-full max-w-[560px] self-center">
        <ScreenHeader tone="light" />
        <FadeInView>
          <View className="flex-row items-end justify-between">
            <Text className="text-2xl font-bold text-white">{title ?? s.label}</Text>
            {right}
          </View>
          {subtitle ? <View className="mt-1">{subtitle}</View> : null}
        </FadeInView>
        {children ? <View className="mt-3">{children}</View> : null}
      </View>
    </LinearGradient>
  );
}
