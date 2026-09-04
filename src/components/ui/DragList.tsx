import { useCallback } from 'react';
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

/**
 * Lista reordenable por arrastre (asa ⠿ a la derecha). Sin FlatList: son
 * Views absolutas, así que compone dentro de un ScrollView. Pensada para
 * listas cortas (carteras, categorías).
 */
export function DragList<T>({
  data,
  keyExtractor,
  renderItem,
  itemHeight,
  onReorder,
}: DragListProps<T>) {
  const n = data.length;
  const active = useSharedValue(-1);
  const offsetY = useSharedValue(0);

  const commit = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const keys = data.map(keyExtractor);
      const [moved] = keys.splice(from, 1);
      keys.splice(to, 0, moved);
      onReorder(keys);
    },
    [data, keyExtractor, onReorder],
  );

  return (
    <View style={{ height: itemHeight * n }}>
      {data.map((item, index) => (
        <Row
          key={keyExtractor(item)}
          index={index}
          count={n}
          itemHeight={itemHeight}
          active={active}
          offsetY={offsetY}
          commit={commit}
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
  children: React.ReactNode;
}

function Row({ index, count, itemHeight, active, offsetY, commit, children }: RowProps) {
  const targetIndex = () => {
    'worklet';
    return clamp(
      Math.round((index * itemHeight + offsetY.value) / itemHeight),
      0,
      count - 1,
    );
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
      const t = targetIndex();
      if (a < t && index > a && index <= t) pos = index - 1;
      else if (a > t && index < a && index >= t) pos = index + 1;
    }
    return {
      transform: [{ translateY: withSpring(pos * itemHeight, { damping: 22, stiffness: 220 }) }],
      zIndex: 1,
      opacity: 1,
    };
  });

  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      active.value = index;
    })
    .onUpdate((e) => {
      offsetY.value = e.translationY;
    })
    .onEnd(() => {
      runOnJS(commit)(index, targetIndex());
      active.value = -1;
      offsetY.value = 0;
    })
    .onFinalize(() => {
      active.value = -1;
      offsetY.value = 0;
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
