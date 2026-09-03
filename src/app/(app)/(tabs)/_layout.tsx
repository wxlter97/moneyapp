import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';

import { colors } from '@/theme';

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
}

export const unstable_settings = { initialRouteName: 'dashboard' };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Vista general',
          tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Presupuesto',
          tabBarIcon: ({ color }) => <TabIcon glyph="🎯" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          title: 'Carteras',
          tabBarIcon: ({ color }) => <TabIcon glyph="👛" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Herramientas',
          tabBarIcon: ({ color }) => <TabIcon glyph="🧰" color={color} />,
        }}
      />
      {/* `history` sigue existiendo como ruta (se integra como subtab de
          Vista general en Fase 3), pero ya no ocupa un lugar en la barra. */}
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
  );
}
