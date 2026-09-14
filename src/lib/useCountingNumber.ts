import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const DEFAULT_DURATION = 450;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Anima un número de su valor anterior al nuevo (para `Money`, ver
 * `animate` en `Money.tsx`) en vez de que el texto salte de golpe --
 * "números que cuentan al cambiar de mes/categoría", pedido de la
 * auditoría de producto (Fase 6). `requestAnimationFrame` + estado de React
 * en vez de Reanimated: el contenido de un `<Text>` no es un estilo
 * animable en el hilo de UI, así que no hay ventaja en cruzar ese puente
 * acá -- es un contador, no una transformación visual.
 *
 * Respeta "reducir movimiento" a mano (`AccessibilityInfo`, mismo criterio
 * que `FadeInView` -- Reanimated no participa acá, así que su default de
 * `ReduceMotion.System` no aplica solo).
 */
export function useCountingNumber(target: number, duration = DEFAULT_DURATION, enabled = true): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const reducedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return; // sin esto ni siquiera vale la pena pedirle a AccessibilityInfo
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!cancelled) reducedRef.current = reduced;
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (fromRef.current === target) return;

    // `enabled=false`: sólo se sigue el valor real, sin programar ningún
    // `requestAnimationFrame` -- así `Money` puede llamar a este hook
    // siempre (las reglas de hooks no admiten un `if` alrededor) sin que
    // cada instancia sin `animate` arrastre un loop de animación de fondo
    // que nadie va a mostrar.
    if (!enabled || reducedRef.current || !Number.isFinite(target) || !Number.isFinite(fromRef.current)) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const from = fromRef.current;
    const delta = target - from;
    startRef.current = null;

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      setDisplay(from + delta * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    }
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}
