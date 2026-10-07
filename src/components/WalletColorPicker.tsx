import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AccentColorPicker } from '@/components/AccentColorPicker';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import { WALLET_COLOR_OPTIONS, WALLET_MUTE, walletColorName } from '@/lib/wallets';
import { muteColor } from '@/theme/accents';

interface WalletColorPickerProps {
  /** Hex elegido, o '' si no hay ninguno (se usa el color por defecto del tipo). */
  value: string;
  onChange: (hex: string) => void;
}

const RAINBOW = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF'] as const;

/**
 * Selector de color de cartera: rejilla de colores con su nombre debajo, más
 * "Personalizado" (matiz + hex) para cualquier otro. Tocar de nuevo el color
 * elegido lo quita (vuelve al color por defecto).
 */
export function WalletColorPicker({ value, onChange }: WalletColorPickerProps) {
  const paletteName = walletColorName(value);
  const isCustom = !!value && !paletteName;
  const [customOpen, setCustomOpen] = useState(isCustom);
  const showCustom = customOpen || isCustom;

  const label = !value ? 'Por defecto' : (paletteName ?? `Personalizado ${value.toUpperCase()}`);

  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-text-muted text-sm">Color</Text>
        <Text className="text-text text-sm" accessibilityLabel={`Color elegido: ${label}`}>
          {label}
        </Text>
      </View>

      <View className="-mx-1 flex-row flex-wrap">
        {WALLET_COLOR_OPTIONS.map((c) => {
          const active = !!value && value.toLowerCase() === c.hex.toLowerCase();
          return (
            <Pressable
              key={c.hex}
              onPress={() => {
                haptics.selection();
                setCustomOpen(false);
                onChange(active ? '' : c.hex);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Color ${c.name}`}
              className="w-1/4 items-center gap-1 px-1 py-1.5 active:opacity-60"
            >
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  active ? 'border-2 border-text' : ''
                }`}
                style={{ backgroundColor: muteColor(c.hex, WALLET_MUTE) ?? c.hex }}
              >
                {active ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text
                className={`text-[11px] ${active ? 'text-text font-semibold' : 'text-text-muted'}`}
                numberOfLines={1}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => {
            haptics.selection();
            setCustomOpen(!showCustom);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: isCustom }}
          accessibilityLabel="Color personalizado"
          className="w-1/4 items-center gap-1 px-1 py-1.5 active:opacity-60"
        >
          <View
            className={`h-10 w-10 items-center justify-center overflow-hidden rounded-full ${
              isCustom ? 'border-2 border-text' : ''
            }`}
          >
            <LinearGradient
              colors={RAINBOW}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {isCustom ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
          </View>
          <Text
            className={`text-[11px] ${isCustom ? 'text-text font-semibold' : 'text-text-muted'}`}
            numberOfLines={1}
          >
            Personalizado
          </Text>
        </Pressable>
      </View>

      {showCustom ? <AccentColorPicker hex={value || '#3B82F6'} onChange={onChange} /> : null}
    </View>
  );
}
