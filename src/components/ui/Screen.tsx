import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { dismissModal } from '@/lib/modal';

interface ScreenProps {
  children: ReactNode;
  /** Bordes seguros a aplicar. Por defecto arriba (las tabs cubren abajo). */
  edges?: readonly Edge[];
  /** Sin padding horizontal (para listas full-bleed). */
  noPadding?: boolean;
}

const DismissGestureContext = createContext<GestureType | null>(null);

/**
 * Gesto de "arrastrar para cerrar", expuesto para que `ModalHeader` lo
 * enganche a su manija. `null` fuera de un `Screen` (o si nadie lo consume,
 * no hace nada — las pantallas normales de tabs no tienen manija que lo use).
 */
export function useDismissGesture(): GestureType | null {
  return useContext(DismissGestureContext);
}

/** Cuánto hay que arrastrar (px) para que soltar cierre el modal. */
const DISMISS_THRESHOLD = 110;

/**
 * Contenedor de pantalla: fondo del tema + columna centrada con ancho máximo
 * en desktop. Mobile-first: en pantallas angostas ocupa todo el ancho.
 *
 * También arma (pero no usa por sí mismo) el gesto de arrastre para cerrar:
 * lo consume `ModalHeader` cuando está presente, así que sólo las hojas
 * modales quedan "dismissibles" — el resto de las pantallas lo ignoran.
 */
export function Screen({ children, edges = ['top'], noPadding = false }: ScreenProps) {
  const translateY = useSharedValue(0);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          translateY.value = Math.max(0, translateY.value + e.changeY);
        })
        .onEnd((e) => {
          if (translateY.value > DISMISS_THRESHOLD || e.velocityY > 800) {
            // Termina el gesto (en vez de saltar al valor final) para que la
            // salida se sienta continua con lo que el dedo ya venía haciendo.
            translateY.value = withTiming(
              1000,
              { duration: 180, easing: Easing.in(Easing.cubic) },
              (finished) => {
                if (finished) runOnJS(dismissModal)();
              },
            );
          } else {
            translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
          }
        }),
    [translateY],
  );

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      <DismissGestureContext.Provider value={pan}>
        <Animated.View style={[{ flex: 1 }, style]}>
          <View
            className={`w-full flex-1 self-center max-w-[560px] ${noPadding ? '' : 'px-4'}`}
          >
            {children}
          </View>
        </Animated.View>
      </DismissGestureContext.Provider>
    </SafeAreaView>
  );
}
