import { useCallback, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { TextField } from '@/components/ui/TextField';
import { haptics } from '@/lib/haptics';
import { hueOf, hueToPreviewHex, normalizeHex } from '@/theme/accents';

const TRACK_HEIGHT = 14;
const THUMB = 24;
// Barra de matiz clásica: saturación/brillo al máximo para que se vea el
// espectro completo, aunque el color final (`hueToPreviewHex`) use otros.
const HUE_GRADIENT = [
  '#FF0000',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#0000FF',
  '#FF00FF',
  '#FF0000',
] as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface AccentColorPickerProps {
  hex: string;
  onChange: (hex: string) => void;
}

/**
 * Color picker del acento "Personalizado": slider de matiz (tocar o
 * arrastrar) + campo de hex para precisión. La saturación/luminosidad
 * exactas no importan acá -- `theme/accents.ts::buildCustomAccent` las
 * vuelve a fijar por esquema (igual que cada acento fijo trae su propio
 * tono claro/oscuro), así que este control sólo necesita transmitir matiz +
 * saturación aproximados.
 */
export function AccentColorPicker({ hex, onChange }: AccentColorPickerProps) {
  const [text, setText] = useState(hex);
  const [error, setError] = useState<string | null>(null);
  const trackWidth = useSharedValue(1);
  const thumbX = useSharedValue(0);

  // El campo de texto sigue el hex real (prop), pero sólo cuando cambia
  // "desde afuera" (slider, u otra instancia) -- si lo hiciéramos en cada
  // letra tipeada nunca se podría terminar de escribir un hex válido.
  const lastPropHex = useRef(hex);
  useEffect(() => {
    lastPropHex.current = hex;
    setText(hex);
    setError(null);
  }, [hex]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const commitHue = useCallback((hue: number) => {
    onChangeRef.current(hueToPreviewHex(hue));
  }, []);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      'worklet';
      thumbX.value = clamp(e.x, 0, trackWidth.value);
      runOnJS(haptics.selection)();
      runOnJS(commitHue)((thumbX.value / trackWidth.value) * 360);
    })
    .onUpdate((e) => {
      'worklet';
      thumbX.value = clamp(e.x, 0, trackWidth.value);
      runOnJS(commitHue)((thumbX.value / trackWidth.value) * 360);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB / 2 }],
  }));

  function onTrackLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    trackWidth.value = w;
    thumbX.value = (hueOf(lastPropHex.current) / 360) * w;
  }

  function commitText() {
    const normalized = normalizeHex(text);
    if (!normalized) {
      setError('Hex inválido, ej. #516B45');
      return;
    }
    setError(null);
    onChange(normalized);
  }

  return (
    <View className="gap-3">
      <GestureDetector gesture={pan}>
        <View onLayout={onTrackLayout} className="justify-center py-2.5">
          <LinearGradient
            colors={HUE_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2 }}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: THUMB,
                height: THUMB,
                borderRadius: THUMB / 2,
                borderWidth: 3,
                borderColor: '#FFFFFF',
                backgroundColor: hex,
                shadowColor: '#000',
                shadowOpacity: 0.35,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
              },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>

      <TextField
        label="Hex"
        value={text}
        onChangeText={setText}
        onSubmitEditing={commitText}
        onBlur={commitText}
        autoCapitalize="characters"
        autoCorrect={false}
        error={error ?? undefined}
        placeholder="#516B45"
      />
    </View>
  );
}
