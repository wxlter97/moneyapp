import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { TAB_SCREENS } from '@/components/tabBarConfig';

export const unstable_settings = { initialRouteName: 'dashboard' };

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift' }}
    >
      {TAB_SCREENS.map(({ name, title }) => (
        <Tabs.Screen key={name} name={name} options={{ title }} />
      ))}
    </Tabs>
  );
}
