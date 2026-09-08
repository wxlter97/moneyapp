import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { TAB_SCREENS } from '@/components/tabBarConfig';

export const unstable_settings = { initialRouteName: 'dashboard' };

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      // 'shift' (el default) desliza la pantalla anterior también, y con
      // una tabBar propia (no la nativa) eso se ve como si por unos
      // milisegundos volviera a la pestaña de la que venías. 'fade' evita
      // ese salto -- el propio TabBar ya anima la píldora activa, así que
      // no hace falta una transición de escena vistosa acá.
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      {TAB_SCREENS.map(({ name, title }) => (
        <Tabs.Screen key={name} name={name} options={{ title }} />
      ))}
    </Tabs>
  );
}
