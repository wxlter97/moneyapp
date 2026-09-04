import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon, type TabIconName } from '@/components/ui/TabBarIcon';
import { useColors } from '@/theme';

export const unstable_settings = { initialRouteName: 'dashboard' };

const SCREENS: { name: string; title: string; icon: TabIconName }[] = [
  { name: 'dashboard', title: 'Vista general', icon: 'overview' },
  { name: 'budgets', title: 'Presupuesto', icon: 'budget' },
  { name: 'wallets', title: 'Carteras', icon: 'wallets' },
  { name: 'tools', title: 'Herramientas', icon: 'tools' },
];

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'web' ? 14 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 52 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {SCREENS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <View
                accessibilityLabel={title}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 40,
                  width: 64,
                  borderRadius: 12,
                  backgroundColor: focused ? colors.primary + '1A' : 'transparent',
                }}
              >
                <TabBarIcon name={icon} color={color} focused={focused} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
