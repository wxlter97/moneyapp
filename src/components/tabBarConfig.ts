import type { TabIconName } from './ui/TabBarIcon';

export interface TabScreenConfig {
  name: string;
  title: string;
  icon: TabIconName;
}

/** Fuente única para las 4 pestañas: usado por el `Tabs.Screen` y por la barra flotante. */
export const TAB_SCREENS: TabScreenConfig[] = [
  { name: 'dashboard', title: 'Vista general', icon: 'overview' },
  { name: 'budgets', title: 'Presupuesto', icon: 'budget' },
  { name: 'wallets', title: 'Carteras', icon: 'wallets' },
  { name: 'tools', title: 'Herramientas', icon: 'tools' },
];
