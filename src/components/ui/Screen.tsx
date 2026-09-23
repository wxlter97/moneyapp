import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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
import { useDesktopContentWidth, useIsDesktop } from '@/lib/responsive';

interface ScreenProps {
  children: ReactNode;
  /** Bordes seguros a aplicar. Por defecto arriba (las tabs cubren abajo). */
  edges?: readonly Edge[];
  /** Sin padding horizontal (para listas full-bleed). */
  noPadding?: boolean;
  /**
   * 'page' (default): pantalla completa, igual en mobile y desktop, columna
   * centrada de hasta 560px -- lo que ya hacía este componente. 'drawer': en
   * desktop se muestra como diálogo centrado sobre la pantalla de atrás
   * oscurecida (la ruta usa `transparentModal` en web, ver `DIALOG_OPTIONS`
   * en `(app)/_layout.tsx`) en vez de tomar toda la pantalla -- para formularios rápidos de
   * alta/edición (nueva transacción, cuota, recurrente...), no para
   * pantallas con más contenido (Herramientas, un estado de cuenta) ni para
   * login/register, que se quedan en 'page' (hallazgo de la auditoría de
   * producto: esos formularios quedaban full-screen también en desktop, con
   * casi toda la pantalla vacía -- ver docs/audit-tasks.md, Fase 5). En
   * mobile, 'drawer' se comporta igual que 'page' -- ahí ya está bien como
   * hoja completa. 'wide': como 'page', pero la columna crece hasta 1080px
   * en desktop (`useDesktopContentWidth`) en vez de quedar fija en 560 --
   * para una pantalla pensada con un layout de escritorio propio (grillas de
   * 2+ columnas), no la misma columna angosta de mobile estirada. En mobile
   * se comporta igual que 'page'.
   */
  variant?: 'page' | 'drawer' | 'wide';
}

const DismissGestureContext = createContext<GestureType | null>(null);
const DialogContext = createContext(false);

/** `true` dentro del diálogo centrado de desktop (`variant="drawer"`): ahí
 * `ModalHeader` no muestra la manija de arrastre, que no hace nada. */
export function useIsDialog(): boolean {
  return useContext(DialogContext);
}

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

/** Ancho máximo del diálogo en modo 'drawer' -- suficiente para un formulario
 * de alta/edición sin sentirse angosto. */
const DIALOG_WIDTH = 480;

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
  const isWide = variant === 'wide';
  // Sin efecto salvo en 'wide' -- llamar siempre al hook (reglas de hooks) es
  // barato: en 'page'/'drawer' el resultado simplemente no se usa.
  const wideMaxWidth = useDesktopContentWidth(1080);

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

  // Entrada del diálogo: aparece con un fundido y un leve zoom en vez de
  // golpe (la ruta no tiene animación propia en web, ver `DIALOG_OPTIONS`).
  const enter = useSharedValue(isDrawer ? 0 : 1);
  useEffect(() => {
    if (isDrawer) enter.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [isDrawer, enter]);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: enter.value }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.97 + enter.value * 0.03 }],
  }));

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
            className={`w-full flex-1 ${isDrawer ? '' : 'self-center'} ${
              isDrawer || isWide ? '' : 'max-w-[560px]'
            } ${noPadding ? '' : 'px-4'}`}
            style={[
              isDrawer || !isWide ? undefined : { maxWidth: wideMaxWidth },
              extraBottomPadding ? { paddingBottom: extraBottomPadding } : undefined,
            ]}
          >
            {children}
          </View>
        </Animated.View>
      </DismissGestureContext.Provider>
    </SafeAreaView>
  );

  if (!isDrawer) return content;

  // Diálogo centrado sobre la pantalla de atrás, que sigue montada y visible
  // gracias a `transparentModal` (antes, con `modal`, expo-router la sacaba y
  // el panel quedaba pegado a la derecha sobre un fondo vacío).
  return (
    <View className="flex-1 items-center justify-center p-6" style={styles.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable
          onPress={dismissModal}
          // Sin accessibilityRole/Label a propósito: `ModalHeader` ya expone
          // un botón "Cerrar" real (foco de teclado, lector de pantalla) --
          // duplicar la misma etiqueta acá sólo confundiría qué botón es cuál.
          // Este backdrop es puntero-only (mouse/touch); quien navega por
          // teclado ya tiene Escape (ver el `useEffect` de arriba) y la X.
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        role="dialog"
        aria-modal
        style={[styles.dialog, dialogStyle]}
        className="overflow-hidden rounded-2xl border border-border bg-bg"
      >
        <DialogContext.Provider value>{content}</DialogContext.Provider>
      </Animated.View>
    </View>
  );
}

// Estilos sólo de web (`fixed`, `backdropFilter`, `boxShadow`): los tipos de
// React Native no los conocen, pero react-native-web los pasa tal cual al CSS.
const webOnly = (style: Record<string, unknown>) => (Platform.OS === 'web' ? style : {});

const styles = StyleSheet.create({
  // Por encima de todo lo que la pantalla de atrás tenga en `fixed` o con
  // `zIndex` (la navegación lateral, el botón "+"): sin esto quedaban sin
  // oscurecer y por encima del diálogo.
  overlay: webOnly({ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 }),
  // Oscurecido fuerte y desenfocado: la pantalla de atrás da contexto, pero
  // no compite con el formulario.
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    ...webOnly({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }),
  },
  // Alto según el contenido, con tope en el alto de la ventana: un
  // formulario largo scrollea adentro en vez de salirse de la pantalla.
  dialog: {
    width: '100%',
    maxWidth: DIALOG_WIDTH,
    maxHeight: '100%',
    ...webOnly({ boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)' }),
  },
});
