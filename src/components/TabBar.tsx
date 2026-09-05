import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { SideNav } from './SideNav';
import { TAB_SCREENS } from './tabBarConfig';
import { GlassSurface } from './ui/GlassSurface';
import { TabBarIcon, type TabIconName } from './ui/TabBarIcon';
import { haptics } from '@/lib/haptics';
import { useIsDesktop } from '@/lib/responsive';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';
import { fonts } from '@/theme/typography';

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

const BAR_HEIGHT = 68;
const H_MARGIN = 16;
// Mismo radio que el resto de los "containers" grandes de la app (`Card`,
// `rounded-3xl` = 32px) — antes era la mitad de la altura (una píldora
// completa), lo que no coincidía con el radio de las demás superficies.
const BAR_RADIUS = 32;
// Radio de la píldora de la pestaña activa: concéntrico con el radio de la
// barra (32) descontando el inset que la separa de ese borde (~9px entre el
// padding de la fila y el del botón) — si no, se ve más cuadrada que el
// contenedor que la rodea.
const TAB_PILL_RADIUS = BAR_RADIUS - 9;

/**
 * Barra de pestañas flotante, estilo "liquid glass": vidrio + degradado del
 * tema, esquinas redondeadas (mismo radio que el resto de las cards) y
 * separada del borde. Misma apariencia en iOS/Android/Web (usa
 * `GlassSurface`, no APIs exclusivas). Etiqueta siempre visible bajo el
 * ícono; la pestaña activa se distingue con una píldora sólida del color de
 * acento (no un tinte de 10% como antes).
 */
export function TabBar({ state, navigation, insets }: TabBarProps) {
  const colors = useColors();
  const isDesktop = useIsDesktop();
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 18 : 12);

  function navigate(name: string, index: number) {
    if (index === state.index) return;
    const route = state.routes[index];
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      haptics.tap();
      navigation.navigate(name);
    }
  }

  // Desktop web: barra lateral fija en el margen que ya deja la columna
  // centrada, en vez de la píldora flotante pensada para pulgares.
  if (isDesktop) {
    return (
      <SideNav
        routes={state.routes}
        activeIndex={state.index}
        onNavigate={(name) => navigate(name, state.routes.findIndex((r) => r.name === name))}
      />
    );
  }

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
          // El radio va también acá (no solo en `GlassSurface`): en web,
          // `shadow*`/`elevation` se traducen a un box-shadow CSS sobre ESTE
          // contenedor, que sin `borderRadius` propio queda cuadrado aunque
          // la superficie de vidrio de adentro sí esté redondeada.
          borderRadius: BAR_RADIUS,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <GlassSurface radius={BAR_RADIUS}>
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
                  colors={colors}
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
  colors,
  onPress,
}: {
  focused: boolean;
  icon: TabIconName;
  label: string;
  colors: { primary: string; primaryFg: string; textMuted: string };
  onPress: () => void;
}) {
  const press = useSharedValue(1);
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 200 });
  }, [focused, lift]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));
  // Aparece con un fundido + leve "pop" de escala en vez de saltar de golpe.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ scale: 0.9 + lift.value * 0.1 }],
  }));

  const fg = focused ? colors.primaryFg : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.94, { damping: 14, stiffness: 320 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}
    >
      <Animated.View style={[{ borderRadius: TAB_PILL_RADIUS, alignSelf: 'stretch' }, bubbleStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: TAB_PILL_RADIUS, backgroundColor: colors.primary },
            pillStyle,
          ]}
        />
        <View style={{ paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', gap: 2 }}>
          <TabBarIcon name={icon} color={fg} focused={focused} />
          <Text
            numberOfLines={1}
            style={{
              color: fg,
              fontSize: 10.5,
              fontFamily: focused ? fonts.semibold : fonts.medium,
              maxWidth: 72,
            }}
          >
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
