import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  /** Bordes seguros a aplicar. Por defecto arriba (las tabs cubren abajo). */
  edges?: readonly Edge[];
  /** Sin padding horizontal (para listas full-bleed). */
  noPadding?: boolean;
}

/**
 * Contenedor de pantalla: fondo del tema + columna centrada con ancho máximo
 * en desktop. Mobile-first: en pantallas angostas ocupa todo el ancho.
 */
export function Screen({ children, edges = ['top'], noPadding = false }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      <View
        className={`w-full flex-1 self-center max-w-[560px] ${noPadding ? '' : 'px-4'}`}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
