import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface DragListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  /** Contenido de la fila (sin el asa de arrastre, que la pone DragList). */
  renderItem: (item: T) => React.ReactNode;
  itemHeight: number;
  /** Nuevo orden de claves tras soltar. */
  onReorder: (orderedKeys: string[]) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const SPRING = { damping: 22, stiffness: 220 };

/**
 * Lista reordenable por arrastre (asa ⠿ a la derecha). Sin FlatList: son
 * Views absolutas, así que compone dentro de un ScrollView. Pensada para
 * listas cortas (carteras, categorías).
 *
 * El orden que se ve al soltar es local (`order`), no el de `data` -- si
 * dependiera de que el padre reciba la respuesta del servidor y vuelva a
 * pasar `data` ya reordenado, la fila saltaría un instante a su posición
 * VIEJA (única que conoce en ese momento) antes de saltar a la nueva en
 * cuanto llegara esa respuesta. Acá se reordena al soltar, sin esperar a
 * nadie, y `onReorder` queda solo para persistirlo -- si esa persistencia
 * falla, el padre puede invalidar su query y `data` volverá a traer el
 * orden real, que el efecto de abajo adopta de vuelta.
 */
export function DragList<T>({
  data,
  keyExtractor,
  renderItem,
  itemHeight,
  onReorder,
}: DragListProps<T>) {
  const [order, setOrder] = useState(() => data.map(keyExtractor));
  const dragging = useRef(false);

  // Resincroniza si `data` cambia por fuera (primera carga, pull-to-refresh,
  // o un reorder que falló y el padre invalidó la query) -- pero nunca en
  // medio de un arrastre, para no pisar la animación de asentamiento.
  useEffect(() => {
    if (dragging.current) return;
    setOrder(data.map(keyExtractor));
  }, [data, keyExtractor]);

  const byKey = useMemo(() => {
    const m = new Map<string, T>();
    for (const item of data) m.set(keyExtractor(item), item);
    return m;
  }, [data, keyExtractor]);

  const items = useMemo(
    () => order.map((k) => byKey.get(k)).filter((item): item is T => item != null),
    [order, byKey],
  );
  const n = items.length;
  const active = useSharedValue(-1);
  const offsetY = useSharedValue(0);

  const setDragging = useCallback((value: boolean) => {
    dragging.current = value;
  }, []);

  const commit = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      setOrder((prev) => {
        const keys = [...prev];
        const [moved] = keys.splice(from, 1);
        keys.splice(to, 0, moved);
        onReorder(keys);
        return keys;
      });
    },
    [onReorder],
  );

  return (
    <View style={{ height: itemHeight * n }}>
      {items.map((item, index) => (
        <Row
          key={keyExtractor(item)}
          index={index}
          count={n}
          itemHeight={itemHeight}
          active={active}
          offsetY={offsetY}
          commit={commit}
          setDragging={setDragging}
        >
          {renderItem(item)}
        </Row>
      ))}
    </View>
  );
}

interface RowProps {
  index: number;
  count: number;
  itemHeight: number;
  active: ReturnType<typeof useSharedValue<number>>;
  offsetY: ReturnType<typeof useSharedValue<number>>;
  commit: (from: number, to: number) => void;
  setDragging: (value: boolean) => void;
  children: React.ReactNode;
}

function Row({ index, count, itemHeight, active, offsetY, commit, setDragging, children }: RowProps) {
  // Posición objetivo de la fila ACTIVA (la que se está arrastrando), a
  // partir de su propio índice de origen + el desplazamiento del gesto.
  const targetIndex = () => {
    'worklet';
    return clamp(
      Math.round((index * itemHeight + offsetY.value) / itemHeight),
      0,
      count - 1,
    );
  };
  // Misma cuenta, pero para una fila cualquiera dado el índice de origen de
  // la ACTIVA (`a`) -- las filas que no se arrastran necesitan saber a dónde
  // va la activa, no recalcularlo con su propio índice (eso hacía que el
  // resto de la lista no se corriera para abrir espacio mientras arrastrabas).
  const targetIndexFrom = (a: number) => {
    'worklet';
    return clamp(Math.round((a * itemHeight + offsetY.value) / itemHeight), 0, count - 1);
  };

  const style = useAnimatedStyle(() => {
    const a = active.value;
    if (a === index) {
      return {
        transform: [{ translateY: a * itemHeight + offsetY.value }],
        zIndex: 20,
        opacity: 0.95,
      };
    }
    let pos = index;
    if (a !== -1) {
      const t = targetIndexFrom(a);
      if (a < t && index > a && index <= t) pos = index - 1;
      else if (a > t && index < a && index >= t) pos = index + 1;
    }
    return {
      transform: [{ translateY: withSpring(pos * itemHeight, SPRING) }],
      zIndex: 1,
      opacity: 1,
    };
  });

  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      active.value = index;
      runOnJS(setDragging)(true);
    })
    .onUpdate((e) => {
      offsetY.value = e.translationY;
    })
    .onEnd(() => {
      const to = targetIndex();
      runOnJS(commit)(index, to);
      // Termina de asentarse en el casillero final (sigue "activa" mientras
      // tanto: zIndex arriba, semi-transparente) y recién ahí se desactiva
      // -- si se desactivara ya (como antes), esta fila usaría su `index`
      // viejo (el nuevo recién le llega al padre por props) y se vería
      // saltar de vuelta al lugar de origen antes de volver a moverse.
      offsetY.value = withSpring((to - index) * itemHeight, SPRING, (finished) => {
        if (finished) {
          active.value = -1;
          offsetY.value = 0;
        }
      });
    })
    .onFinalize((_event, success) => {
      runOnJS(setDragging)(false);
      // `onEnd` (arriba) ya deja programado el spring de asentamiento + su
      // propio reset de `active`/`offsetY` al terminar -- pisarlo acá
      // cancelaría ese spring a mitad de camino y la fila volvería a
      // saltar. Sólo hace falta soltar el estado a la fuerza cuando el
      // gesto NO terminó por `onEnd` (se canceló, p. ej. porque el
      // ScrollView se adueñó del toque): ahí no hay ningún spring en
      // camino y, si no se resetea acá, la fila quedaría flotando.
      if (!success) {
        active.value = -1;
        offsetY.value = 0;
      }
    });

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, right: 0, height: itemHeight },
        style,
      ]}
    >
      <View className="flex-row items-center">
        <View className="flex-1">{children}</View>
        <GestureDetector gesture={pan}>
          <View
            className="h-10 w-10 items-center justify-center"
            accessibilityLabel="Arrastrar para reordenar"
          >
            <Text className="text-text-muted text-lg">⠿</Text>
          </View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}
