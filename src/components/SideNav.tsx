import { Pressable, Text, View } from 'react-native';

import { TAB_SCREENS } from './tabBarConfig';
import { GlassSurface } from './ui/GlassSurface';
import { TabBarIcon, type TabIconName } from './ui/TabBarIcon';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface TabRoute {
  key: string;
  name: string;
}
interface SideNavProps {
  routes: TabRoute[];
  activeIndex: number;
  onNavigate: (name: string) => void;
}

const RADIUS = 28;
const WIDTH = 208;

/**
 * Navegación lateral fija para desktop web: reemplaza a la píldora flotante
 * de abajo (pensada para pulgares) cuando hay ancho de sobra. Vive en el
 * margen que ya deja `Screen` al centrar su columna (`MAX_CONTENT_WIDTH`),
 * así que no hace falta correr el contenido — sólo aparece en el hueco que
 * ya estaba vacío a la izquierda.
 */
export function SideNav({ routes, activeIndex, onNavigate }: SideNavProps) {
  const colors = useColors();

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'fixed' as 'absolute', left: 24, top: 0, bottom: 0, justifyContent: 'center' }}
    >
      <GlassSurface radius={RADIUS} style={{ width: WIDTH }}>
        <View style={{ padding: 10, gap: 2 }}>
          {routes.map((route, index) => {
            const cfg = TAB_SCREENS.find((s) => s.name === route.name);
            if (!cfg) return null;
            const focused = activeIndex === index;
            return (
              <SideNavButton
                key={route.key}
                focused={focused}
                icon={cfg.icon}
                label={cfg.title}
                colors={colors}
                onPress={() => {
                  haptics.tap();
                  onNavigate(route.name);
                }}
              />
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

function SideNavButton({
  focused,
  icon,
  label,
  colors,
  onPress,
}: {
  focused: boolean;
  icon: TabIconName;
  label: string;
  colors: { primary: string; primaryFg: string; text: string; textMuted: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: RADIUS - 12,
        backgroundColor: focused ? colors.primary : 'transparent',
      }}
    >
      <TabBarIcon name={icon} color={focused ? colors.primaryFg : colors.textMuted} focused={focused} />
      <Text
        style={{
          color: focused ? colors.primaryFg : colors.text,
          fontSize: 14.5,
          fontFamily: focused ? fonts.semibold : fonts.medium,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
