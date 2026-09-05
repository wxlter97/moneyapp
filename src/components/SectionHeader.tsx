import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInView } from './ui/FadeInView';
import { GlassSurface } from './ui/GlassSurface';
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
 * Cabecera de pantalla: panel de vidrio fijo (mismo lenguaje que la barra de
 * pestañas), no una sección más de la página — con esto se lee como el
 * chrome de una app y no como el encabezado de una web. Se extiende por
 * detrás del status bar / Dynamic Island (el panel arranca en y=0; el
 * contenido se acomoda con `insets.top`, no al revés) y separa del
 * contenido con una línea fina abajo en vez de compartir el mismo fondo
 * plano que el resto de la pantalla. El padding inferior va siempre en el
 * contenedor (no sólo cuando hay `children`): sin `subtitle`/`children`
 * (p. ej. Carteras, Herramientas) la fila de título quedaba pegada a esa
 * línea, sin aire.
 */
export function SectionHeader({ title, subtitle, right, children }: SectionHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <GlassSurface radius={0} border={false} className="border-b border-border/50">
      <View
        className="w-full max-w-[560px] self-center px-4 pb-3"
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
        {children ? <View className="mt-4">{children}</View> : null}
      </View>
    </GlassSurface>
  );
}
