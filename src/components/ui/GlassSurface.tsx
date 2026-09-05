import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { useColors } from '@/theme';

interface GlassSurfaceProps {
  children?: ReactNode;
  /** Radio de esquina (default 24, estilo "pill" en HIG). */
  radius?: number;
  /** Intensidad del blur nativo, 1–100. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Borde de 1px alrededor de todo el panel (default true). La cabecera
   * fija pasa `false` y agrega ella misma sólo el de abajo, vía `className`. */
  border?: boolean;
}

/**
 * Superficie "vidrio líquido": blur real (BlurView) + un tinte del color de
 * superficie del tema por encima, para que el resultado combine con nuestra
 * paleta en vez del tinte de sistema. Misma apariencia en iOS, Android
 * (SDK 31+; en versiones viejas cae a una vista semitransparente) y Web
 * (backdrop-filter) — sin depender de Liquid Glass nativo de iOS.
 */
export function GlassSurface({
  children,
  radius = 24,
  intensity = 40,
  style,
  className,
  border = true,
}: GlassSurfaceProps) {
  const colors = useColors();

  return (
    <View
      className={className}
      style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
    >
      <BlurView
        intensity={intensity}
        tint="systemChromeMaterial"
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.surface, opacity: Platform.OS === 'web' ? 0.72 : 0.55 },
        ]}
      />
      <View
        pointerEvents="box-none"
        style={
          border ? { borderRadius: radius, borderWidth: 1, borderColor: colors.border + '80' } : undefined
        }
      >
        {children}
      </View>
    </View>
  );
}
