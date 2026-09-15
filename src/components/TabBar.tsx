import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, type LayoutChangeEvent, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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

const BAR_HEIGHT = 60;
const H_MARGIN = 16;
// Mismo radio que el resto de los "containers" grandes de la app (`Card`,
// `rounded-3xl` = 32px) — antes era la mitad de la altura (una píldora
// completa), lo que no coincidía con el radio de las demás superficies.
const BAR_RADIUS = 30;
const PILL_HEIGHT = 42;
const PILL_RADIUS = 21;

interface Rect {
  x: number;
  width: number;
}

/**
 * Barra de pestañas flotante, estilo "liquid glass": vidrio + esquinas
 * redondeadas (mismo radio que el resto de las cards), separada del borde.
 * Misma apariencia en iOS/Android/Web (usa `GlassSurface`, no APIs
 * exclusivas).
 *
 * Sólo la pestaña activa muestra texto junto al ícono -- las demás son un
 * círculo de ícono solo. La píldora en sí es UN sólo elemento compartido
 * (no una por botón) que se desliza y cambia de ancho hasta la posición
 * real del botón activo (medida con `onLayout`, no adivinada): antes cada
 * botón tenía su propia píldora que entraba/salía con la animación de
 * layout genérica de Reanimated, y con un cambio de ancho grande (ícono
 * solo -> ícono + texto) eso se ve como un pop que crece desde el centro,
 * no como un movimiento continuo -- lo mismo que "carpeta" pedía evitar.
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
          <SlidingRow state={state} navigation={navigation} colors={colors} />
        </GlassSurface>
      </View>
    </View>
  );
}

function SlidingRow({
  state,
  navigation,
  colors,
}: Pick<TabBarProps, 'state' | 'navigation'> & {
  colors: { primary: string; primaryFg: string; textMuted: string };
}) {
  const [rects, setRects] = useState<Record<number, Rect>>({});
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const measuredOnce = useRef(false);

  const activeRect = rects[state.index];
  useEffect(() => {
    if (!activeRect) return;
    if (!measuredOnce.current) {
      // Primer layout real: directo a la posición, sin deslizar desde 0 -- si
      // no, la píldora "vuela" desde la esquina apenas se abre la pantalla.
      pillX.value = activeRect.x;
      pillW.value = activeRect.width;
      measuredOnce.current = true;
      return;
    }
    pillX.value = withTiming(activeRect.x, { duration: 320, easing: Easing.out(Easing.cubic) });
    pillW.value = withTiming(activeRect.width, { duration: 320, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRect?.x, activeRect?.width]);

  const pillStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: pillX.value,
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    width: pillW.value,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: colors.primary,
    opacity: measuredOnce.current ? 1 : 0,
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: BAR_HEIGHT,
        paddingHorizontal: 10,
      }}
    >
      <Animated.View pointerEvents="none" style={pillStyle} />
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
            onLayout={(rect) => setRects((prev) => ({ ...prev, [index]: rect }))}
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
  );
}

function TabBarButton({
  focused,
  icon,
  label,
  colors,
  onPress,
  onLayout,
}: {
  focused: boolean;
  icon: TabIconName;
  label: string;
  colors: { primary: string; primaryFg: string; textMuted: string };
  onPress: () => void;
  onLayout: (rect: Rect) => void;
}) {
  const press = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const fg = focused ? colors.primaryFg : colors.textMuted;

  function handleLayout(e: LayoutChangeEvent) {
    const { x, width } = e.nativeEvent.layout;
    onLayout({ x, width });
  }

  return (
    <Pressable
      onLayout={handleLayout}
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
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            height: PILL_HEIGHT,
            paddingHorizontal: focused ? 15 : 11,
          },
          scaleStyle,
        ]}
      >
        <TabBarIcon name={icon} color={fg} focused={focused} />
        {focused ? (
          <Animated.Text
            entering={FadeIn.duration(160)}
            numberOfLines={1}
            style={{ color: fg, fontSize: 13.5, fontFamily: fonts.semibold, maxWidth: 92 }}
          >
            {label}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
