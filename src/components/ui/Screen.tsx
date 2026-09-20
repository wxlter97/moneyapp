import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
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
import { useIsDesktop } from '@/lib/responsive';

interface ScreenProps {
  children: ReactNode;
  /** Bordes seguros a aplicar. Por defecto arriba (las tabs cubren abajo). */
  edges?: readonly Edge[];
  /** Sin padding horizontal (para listas full-bleed). */
  noPadding?: boolean;
  /**
   * 'page' (default): pantalla completa, igual en mobile y desktop -- lo que
   * ya hacía este componente. 'drawer': en desktop se muestra como panel
   * lateral (ancho fijo, entra desde la derecha) en vez de tomar toda la
   * pantalla -- para formularios rápidos de alta/edición (nueva transacción,
   * cuota, recurrente...), no para pantallas con más contenido (Herramientas,
   * un estado de cuenta) ni para login/register, que se quedan en 'page'
   * (hallazgo de la auditoría de producto: esos formularios quedaban
   * full-screen también en desktop, con casi toda la pantalla vacía -- ver
   * docs/audit-tasks.md, Fase 5). En mobile, 'drawer' se comporta igual que
   * 'page' -- ahí ya está bien como hoja completa.
   */
  variant?: 'page' | 'drawer';
}

const DismissGestureContext = createContext<GestureType | null>(null);

/**
 * Gesto de "arrastrar para cerrar", expuesto para que `ModalHeader` lo
 * enganche a su manija. `null` fuera de un `Screen` (o si nadie lo consume,
 * no hace nada — las pantallas normales de tabs no tienen manija que lo use),
 * y también `null` en el panel lateral de desktop (ahí no hay nada que
 * arrastrar hacia abajo; se cierra con el backdrop, la X o Escape).
 */
export function useDismissGesture(): GestureType | null {
  return useContext(DismissGestureContext);
}

/** Cuánto hay que arrastrar (px) para que soltar cierre el modal. */
const DISMISS_THRESHOLD = 110;

/** Ancho del panel en modo 'drawer' -- suficiente para un formulario de
 * alta/edición sin sentirse angosto, bastante menos que el máximo de 560 de
 * una pantalla 'page' completa (a esta escala, sigue leyéndose como un panel
 * lateral, no como la pantalla entera corrida a la derecha). */
const DRAWER_WIDTH = 440;

/**
 * Contenedor de pantalla: fondo del tema + columna centrada con ancho máximo
 * en desktop. Mobile-first: en pantallas angostas ocupa todo el ancho.
 *
 * También arma (pero no usa por sí mismo) el gesto de arrastre para cerrar:
 * lo consume `ModalHeader` cuando está presente, así que sólo las hojas
 * modales quedan "dismissibles" — el resto de las pantallas lo ignoran.
 */
export function Screen({ children, edges = ['top'], noPadding = false, variant = 'page' }: ScreenProps) {
  const isDesktop = useIsDesktop();
  const isDrawer = variant === 'drawer' && isDesktop;

  const translateY = useSharedValue(0);
  // El inset de `SafeAreaView` para 'bottom' es justo el borde del área que
  // iOS reserva para sus propios gestos (home indicator / swipe-up) -- ni un
  // pixel más. Un botón de acción pegado a ese límite queda tan cerca del
  // borde físico que un toque cerca de su base puede colar como gesto del
  // sistema en vez de llegar al botón. Este margen extra separa el
  // contenido de esa zona en vez de tocarla justo.
  const extraBottomPadding = edges.includes('bottom') ? 16 : 0;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          translateY.set(Math.max(0, translateY.get() + e.changeY));
        })
        .onEnd((e) => {
          if (translateY.get() > DISMISS_THRESHOLD || e.velocityY > 800) {
            // Termina el gesto (en vez de saltar al valor final) para que la
            // salida se sienta continua con lo que el dedo ya venía haciendo.
            translateY.set(
              withTiming(1000, { duration: 180, easing: Easing.in(Easing.cubic) }, (finished) => {
                if (finished) runOnJS(dismissModal)();
              }),
            );
          } else {
            translateY.set(withSpring(0, { damping: 20, stiffness: 300 }));
          }
        }),
    [translateY],
  );

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  // Entrada del panel lateral: desliza desde la derecha en vez de aparecer
  // de golpe -- mismo lenguaje de movimiento que la hoja modal de mobile
  // (`slide_from_right` del Stack), sólo que acá es el panel, no toda la
  // pantalla.
  const enterX = useSharedValue(isDrawer ? DRAWER_WIDTH : 0);
  useEffect(() => {
    if (isDrawer) enterX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [isDrawer, enterX]);
  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: enterX.value }] }));

  // Escape para cerrar -- sólo tiene sentido en web (el resto de las formas
  // de cerrar en desktop -- click en el backdrop, la X -- ya andan igual que
  // en mobile). `dismissModal` es estable (no captura estado propio), así
  // que no hace falta re-suscribir en cada render.
  useEffect(() => {
    if (!isDrawer || Platform.OS !== 'web') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDrawer]);

  const content = (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      <DismissGestureContext.Provider value={isDrawer ? null : pan}>
        <Animated.View style={isDrawer ? { flex: 1 } : [{ flex: 1 }, dragStyle]}>
          <View
            className={`w-full flex-1 ${isDrawer ? '' : 'self-center max-w-[560px]'} ${
              noPadding ? '' : 'px-4'
            }`}
            style={extraBottomPadding ? { paddingBottom: extraBottomPadding } : undefined}
          >
            {children}
          </View>
        </Animated.View>
      </DismissGestureContext.Provider>
    </SafeAreaView>
  );

  if (!isDrawer) return content;

  // El panel lateral no dimeriza la pantalla anterior de verdad -- en web,
  // `expo-router` desmonta la ruta anterior en vez de dejarla viva detrás
  // (así es como funciona un modal nativo en iOS, no como navega la versión
  // web) -- así que "atrás" no es visible ni dimerizable. Lo que sí se
  // resuelve es el problema real: el formulario ya no ocupa el ancho
  // completo con casi todo vacío, vive en una columna fija a la derecha.
  return (
    <View className="flex-1 flex-row bg-bg">
      <Pressable
        onPress={dismissModal}
        // Sin accessibilityRole/Label a propósito: `ModalHeader` ya expone
        // un botón "Cerrar" real (foco de teclado, lector de pantalla) --
        // duplicar la misma etiqueta acá sólo confundiría qué botón es cuál.
        // Este backdrop es puntero-only (mouse/touch); quien navega por
        // teclado ya tiene Escape (ver el `useEffect` de arriba) y la X.
        className="flex-1"
      />
      <Animated.View style={[drawerStyle, { width: DRAWER_WIDTH }]} className="border-l border-border">
        {content}
      </Animated.View>
    </View>
  );
}
