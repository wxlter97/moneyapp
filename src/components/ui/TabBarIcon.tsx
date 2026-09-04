import Svg, { Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';

export type TabIconName = 'overview' | 'budget' | 'wallets' | 'tools';

/**
 * Iconos de la barra de pestañas: trazo monocromático simple, sin relleno,
 * dibujados a mano en un lienzo de 24×24. Siguen el color activo/inactivo que
 * pasa `expo-router`.
 */
const PATHS: Record<TabIconName, string> = {
  // casa
  overview: 'M3 10.5 12 4l9 6.5M5.5 9.5V19a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.5',
  // diana
  budget: 'M12 3v3M12 18v3M3 12h3M18 12h3',
  // billetera
  wallets:
    'M4 8.5A2.5 2.5 0 0 1 6.5 6H17a2 2 0 0 1 2 2v0M4 8.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 8.5ZM16.5 13.5h.01',
  // herramientas (llave)
  tools:
    'M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.5 2.5-2.1-.4-.4-2.1 2.4-2.5Z',
};

export function TabBarIcon({
  name,
  color,
  focused,
}: {
  name: TabIconName;
  color: ColorValue;
  focused: boolean;
}) {
  const extra =
    name === 'budget'
      ? 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M12 12m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0'
      : '';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d={PATHS[name] + (extra ? ' ' + extra : '')}
        stroke={color}
        strokeWidth={focused ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
