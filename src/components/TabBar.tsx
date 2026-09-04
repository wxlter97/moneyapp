import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { TAB_SCREENS } from './tabBarConfig';
import { GlassSurface } from './ui/GlassSurface';
import { TabBarIcon, type TabIconName } from './ui/TabBarIcon';
import { haptics } from '@/lib/haptics';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

// Forma mínima de `BottomTabBarProps` de React Navigation que realmente
// usamos: evita importar tipos de rutas internas (`expo-router/build/...`)
// para un contrato que es estable desde hace años.
interface TabRoute {
  key: string;
  name: string;
}
interface TabBarProps {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
  insets: EdgeInsets;
}

const BAR_HEIGHT = 60;
const H_MARGIN = 16;

/**
 * Barra de pestañas flotante, estilo "liquid glass": vidrio + degradado del
 * tema, esquinas totalmente redondeadas y separada del borde. Misma
 * apariencia en iOS/Android/Web (usa `GlassSurface`, no APIs exclusivas).
 * Indicador de tab activo animado + resorte al presionar + haptics.
 */
export function TabBar({ state, navigation, insets }: TabBarProps) {
  const colors = useColors();
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 18 : 12);

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom, alignItems: 'center' }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + H_MARGIN * 2,
          paddingHorizontal: H_MARGIN,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <GlassSurface radius={BAR_HEIGHT / 2}>
          <View style={{ flexDirection: 'row', height: BAR_HEIGHT, paddingHorizontal: 6 }}>
            {state.routes.map((route, index) => {
              const cfg = TAB_SCREENS.find((s) => s.name === route.name);
              if (!cfg) return null;
              const focused = state.index === index;
              return (
                <TabBarButton
                  key={route.key}
                  focused={focused}
                  icon={cfg.icon}
                  label={cfg.title}
                  color={focused ? colors.primary : colors.textMuted}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!focused && !event.defaultPrevented) {
                      haptics.tap();
                      navigation.navigate(route.name);
                    }
                  }}
                />
              );
            })}
          </View>
        </GlassSurface>
      </View>
    </View>
  );
}

function TabBarButton({
  focused,
  icon,
  label,
  color,
  onPress,
}: {
  focused: boolean;
  icon: TabIconName;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const press = useSharedValue(1);
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 200 });
  }, [focused, lift]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }, { translateY: lift.value * -2 }],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ scale: 0.85 + lift.value * 0.15 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.86, { damping: 14, stiffness: 320 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          { height: 40, width: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
          bubbleStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 14, backgroundColor: color + '1A' },
            pillStyle,
          ]}
        />
        <TabBarIcon name={icon} color={color} focused={focused} />
      </Animated.View>
    </Pressable>
  );
}
