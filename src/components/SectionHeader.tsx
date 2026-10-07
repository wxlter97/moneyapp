import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from './ui/GlassSurface';
import { ScreenHeader } from './ScreenHeader';
import { IconButton } from './ui/IconButton';
import { haptics } from '@/lib/haptics';
import { useUIStore } from '@/store/ui';
import { useColors } from '@/theme';

interface SectionHeaderProps {
  /** Etiqueta pequeña sobre el contenido principal ("Inicio", "Carteras"…). */
  title?: string;
  /** Contenido principal: normalmente una cifra grande (`<Money className="text-hero" />`). */
  subtitle?: ReactNode;
  /** Acción alineada a la derecha de la etiqueta (botón "Ajustar", "+ Nueva"…). */
  right?: ReactNode;
  /** Subtabs u otro contenido al pie. */
  children?: ReactNode;
  /** Ancho máximo del panel (default 560, el de casi toda la app) -- para
   * que la cabecera no quede más angosta que el cuerpo de la pantalla
   * cuando ese cuerpo se ensancha en desktop (ver `budgets.tsx`/`wallets.tsx`). */
  maxWidth?: number;
  /** Muestra el "ojito" junto al título para ocultar/mostrar la cifra grande
   * (preferencia compartida entre pantallas: `useUIStore.hideAmounts`). */
  hideToggle?: boolean;
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
export function SectionHeader({
  title,
  subtitle,
  right,
  children,
  maxWidth = 560,
  hideToggle = false,
}: SectionHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const hidden = useUIStore((s) => s.hideAmounts);
  const toggleHidden = useUIStore((s) => s.toggleHideAmounts);

  return (
    <GlassSurface radius={0} border={false} className="border-b border-border/50">
      <View
        className="w-full self-center px-4 pb-3"
        style={{ paddingTop: insets.top + 8, maxWidth }}
      >
        <ScreenHeader />
        {/* Antes entraba con un fundido (`FadeInView`) -- es la cabecera de
            CASI todas las pantallas, así que se repetía en cada navegación
            (cambiar de pestaña, abrir un modal) en vez de verse una sola
            vez: más titileo que pulido. Se muestra directo. */}
        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-row items-center gap-2">
            {title ? (
              <Text className="text-text-muted text-[13px] font-semibold uppercase tracking-wide">
                {title}
              </Text>
            ) : null}
            {hideToggle ? (
              <IconButton
                icon={hidden ? 'eye-off' : 'eye'}
                size={24}
                iconSize={16}
                color={colors.textMuted}
                onPress={() => {
                  haptics.tap();
                  toggleHidden();
                }}
                accessibilityLabel={hidden ? 'Mostrar montos' : 'Ocultar montos'}
              />
            ) : null}
          </View>
          {right}
        </View>
        {subtitle ? <View className="mt-1">{subtitle}</View> : null}
        {children ? <View className="mt-4">{children}</View> : null}
      </View>
    </GlassSurface>
  );
}
