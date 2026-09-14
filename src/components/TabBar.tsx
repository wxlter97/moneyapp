import { Platform, Pressable, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
// La píldora del botón activo es más chica que la barra que la contiene
// (altura del botón, no de la barra completa) -- coherente con que ahora
// sólo el botón activo tiene forma de píldora "real": los inactivos son un
// círculo de ícono solo.
const PILL_RADIUS = 22;

/**
 * Barra de pestañas flotante, estilo "liquid glass": vidrio + esquinas
 * redondeadas (mismo radio que el resto de las cards), separada del borde.
 * Misma apariencia en iOS/Android/Web (usa `GlassSurface`, no APIs
 * exclusivas).
 *
 * Sólo la pestaña activa muestra texto junto al ícono, dentro de una
 * píldora sólida en Faro (identidad, ver Fase 3) -- las demás son un
 * círculo de ícono solo. Antes las 4 mostraban ícono + etiqueta apiladas
 * siempre: se veía más cargado que el resto de la app, que ya usa el color
 * de acento como la única señal de "esto está seleccionado" en todos lados
 * (Herramientas → Apariencia, filtros, segmented controls...) — acá no
 * hacía excepción, sólo le faltaba dejar de repetir el texto 4 veces.
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: BAR_HEIGHT,
              paddingHorizontal: 10,
            }}
          >
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
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
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
    >
      {/* `layout`: cuando el ancho cambia (el texto entra/sale al cambiar de
          pestaña) el resto de la fila se acomoda con una transición en vez
          de saltar de golpe. */}
      <Animated.View layout={LinearTransition.springify().damping(16).stiffness(220)} style={scaleStyle}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            height: 42,
            paddingHorizontal: focused ? 15 : 11,
            borderRadius: PILL_RADIUS,
            backgroundColor: focused ? colors.primary : 'transparent',
          }}
        >
          <TabBarIcon name={icon} color={fg} focused={focused} />
          {focused ? (
            <Animated.Text
              entering={FadeIn.duration(140)}
              numberOfLines={1}
              style={{
                color: fg,
                fontSize: 13.5,
                fontFamily: fonts.semibold,
                maxWidth: 92,
              }}
            >
              {label}
            </Animated.Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}
