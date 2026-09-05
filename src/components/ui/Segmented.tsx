import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

// Mismo inset que el `p-1` (4px) del contenedor.
const PADDING = 4;
// El contenedor usa `rounded-xl` (18px, ver tailwind.config.js). Para que la
// píldora se vea "igual de redonda" que el borde exterior (concéntrica, no
// con esquinas más cuadradas que las de afuera) su radio debe ser el del
// contenedor menos el inset que la separa de ese borde.
const PILL_RADIUS = 18 - PADDING;

export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  const colors = useColors();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const count = options.length;
  const pos = useSharedValue(index);
  // Ancho real del contenedor, medido: un `left`/`width` en % no descuenta el
  // padding del contenedor (para RN es % del layout box completo, borde
  // incluido), así que la píldora del primer/último segmento quedaba pegada
  // al borde redondeado en vez de respetar el mismo margen que el resto.
  // Con píxeles exactos (como ya hacemos con los gráficos SVG) el inset da
  // igual en los cuatro costados.
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    pos.value = withSpring(index, { damping: 18, stiffness: 220 });
  }, [index, pos]);

  const segmentWidth = count > 0 ? Math.max(containerWidth - PADDING * 2, 0) / count : 0;

  // `className` no se resuelve en `Animated.View` de reanimated: todo el
  // estilo va en `style` (nativewind sólo intercepta los primitivos de RN).
  const pillStyle = useAnimatedStyle(() => ({
    left: PADDING + pos.value * segmentWidth,
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    width: segmentWidth,
    borderRadius: PILL_RADIUS,
    backgroundColor: colors.primary,
  }));

  return (
    <View
      className="flex-row rounded-xl border border-border bg-surface p-1"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View pointerEvents="none" style={pillStyle} />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (!active) haptics.selection();
              onChange(opt.value);
            }}
            className="flex-1 items-center rounded-lg px-2 py-2"
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text className={active ? 'text-primary-fg font-semibold' : 'text-text-muted'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
