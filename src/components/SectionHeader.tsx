import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInView } from './ui/FadeInView';
import { ScreenHeader } from './ScreenHeader';

interface SectionHeaderProps {
  /** Etiqueta pequeña sobre el contenido principal ("Vista general", "Carteras"…). */
  title?: string;
  /** Contenido principal: normalmente una cifra grande (`<Money className="text-hero" />`). */
  subtitle?: ReactNode;
  /** Acción alineada a la derecha de la etiqueta (botón "Ajustar", "+ Nueva"…). */
  right?: ReactNode;
  /** Subtabs u otro contenido al pie. */
  children?: ReactNode;
}

/**
 * Cabecera de pantalla: neutra, sin banda de color — el foco es el
 * contenido (una cifra grande), no el chrome. Reemplaza el degradado por
 * sección de la versión anterior (demasiado saturado / "sitio web de 2018").
 */
export function SectionHeader({ title, subtitle, right, children }: SectionHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="w-full max-w-[560px] self-center px-4"
      style={{ paddingTop: insets.top + 8 }}
    >
      <ScreenHeader />
      <FadeInView>
        <View className="flex-row items-center justify-between pt-1">
          {title ? (
            <Text className="text-text-muted text-[13px] font-semibold uppercase tracking-wide">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {right}
        </View>
        {subtitle ? <View className="mt-1">{subtitle}</View> : null}
      </FadeInView>
      {children ? <View className="mt-4 pb-1">{children}</View> : null}
    </View>
  );
}
