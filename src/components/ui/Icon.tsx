import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'check'
  | 'close'
  | 'plus'
  | 'calendar'
  | 'backspace'
  | 'tag'
  | 'repeat'
  | 'receipt'
  | 'download'
  | 'reset'
  | 'swap'
  | 'trash'
  | 'arrow-up-right'
  | 'sign-out'
  | 'grip'
  | 'inbox'
  | 'trending'
  | 'search'
  | 'pencil'
  | 'users'
  | 'copy'
  | 'camera'
  | 'image'
  | 'bolt'
  | 'bell'
  | 'lock'
  | 'face-id'
  | 'split'
  | 'filter'
  | 'bars';

interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

/**
 * Set de iconos de línea, dibujados a mano en un lienzo 24×24 (mismo estilo
 * que `TabBarIcon`). Reemplaza los glifos Unicode (▲ ▾ ‹ › ✓ ⌫ 📅…) que se
 * veían como texto de sitio web en vez de UI nativa.
 */
export function Icon({ name, size = 20, color = '#9AA4B2', strokeWidth = 2 }: IconProps) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'chevron-down' && <Path d="M6 9l6 6 6-6" {...p} />}
      {name === 'chevron-up' && <Path d="M6 15l6-6 6 6" {...p} />}
      {name === 'chevron-left' && <Path d="M15 6l-6 6 6 6" {...p} />}
      {name === 'chevron-right' && <Path d="M9 6l6 6-6 6" {...p} />}
      {name === 'check' && <Path d="M5 13l4 4L19 7" {...p} />}
      {name === 'close' && (
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...p} />
          <Line x1={18} y1={6} x2={6} y2={18} {...p} />
        </>
      )}
      {name === 'plus' && (
        <>
          <Line x1={12} y1={5} x2={12} y2={19} {...p} />
          <Line x1={5} y1={12} x2={19} y2={12} {...p} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={4} y={5} width={16} height={15} rx={3} {...p} />
          <Line x1={4} y1={10} x2={20} y2={10} {...p} />
          <Line x1={8} y1={3} x2={8} y2={7} {...p} />
          <Line x1={16} y1={3} x2={16} y2={7} {...p} />
        </>
      )}
      {name === 'backspace' && (
        <>
          <Path d="M20 5H9L3 12l6 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" {...p} />
          <Line x1={12} y1={9} x2={17} y2={15} {...p} />
          <Line x1={17} y1={9} x2={12} y2={15} {...p} />
        </>
      )}
      {name === 'tag' && (
        <>
          <Path d="M3 3h7l11 11-8 8L3 11V3z" {...p} />
          <Circle cx={7.5} cy={7.5} r={1.3} fill={color} stroke="none" />
        </>
      )}
      {name === 'repeat' && (
        <>
          <Path d="M17 1l4 4-4 4" {...p} />
          <Path d="M3 11V9a4 4 0 0 1 4-4h14" {...p} />
          <Path d="M7 23l-4-4 4-4" {...p} />
          <Path d="M21 13v2a4 4 0 0 1-4 4H3" {...p} />
        </>
      )}
      {name === 'receipt' && (
        <>
          <Rect x={5} y={3} width={14} height={18} rx={2} {...p} />
          <Line x1={8} y1={8} x2={16} y2={8} {...p} />
          <Line x1={8} y1={12} x2={16} y2={12} {...p} />
          <Line x1={8} y1={16} x2={13} y2={16} {...p} />
        </>
      )}
      {name === 'download' && (
        <>
          <Line x1={12} y1={4} x2={12} y2={14} {...p} />
          <Path d="M8 11l4 4 4-4" {...p} />
          <Line x1={5} y1={19} x2={19} y2={19} {...p} />
        </>
      )}
      {name === 'reset' && (
        <>
          <Path d="M20 11A8 8 0 1 0 19 16" {...p} />
          <Path d="M20 5v6h-6" {...p} />
        </>
      )}
      {name === 'swap' && (
        <>
          <Path d="M7 7h13" {...p} />
          <Path d="M16 4l4 3-4 3" {...p} />
          <Path d="M17 17H4" {...p} />
          <Path d="M8 14l-4 3 4 3" {...p} />
        </>
      )}
      {name === 'trash' && (
        <>
          <Line x1={4} y1={7} x2={20} y2={7} {...p} />
          <Path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" {...p} />
          <Path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" {...p} />
          <Line x1={10} y1={11} x2={10} y2={17} {...p} />
          <Line x1={14} y1={11} x2={14} y2={17} {...p} />
        </>
      )}
      {name === 'arrow-up-right' && (
        <>
          <Line x1={7} y1={17} x2={17} y2={7} {...p} />
          <Path d="M9 7h8v8" {...p} />
        </>
      )}
      {name === 'sign-out' && (
        <>
          <Path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" {...p} />
          <Line x1={21} y1={12} x2={9} y2={12} {...p} />
          <Path d="M17 8l4 4-4 4" {...p} />
        </>
      )}
      {name === 'grip' && (
        <>
          <Circle cx={9} cy={6} r={1.3} fill={color} stroke="none" />
          <Circle cx={15} cy={6} r={1.3} fill={color} stroke="none" />
          <Circle cx={9} cy={12} r={1.3} fill={color} stroke="none" />
          <Circle cx={15} cy={12} r={1.3} fill={color} stroke="none" />
          <Circle cx={9} cy={18} r={1.3} fill={color} stroke="none" />
          <Circle cx={15} cy={18} r={1.3} fill={color} stroke="none" />
        </>
      )}
      {name === 'inbox' && (
        <>
          <Path d="M4 12h4l2 3h4l2-3h4" {...p} />
          <Path d="M5.5 5h13L21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6L5.5 5z" {...p} />
        </>
      )}
      {name === 'trending' && (
        <>
          <Path d="M3 17l6-6 4 4 8-8" {...p} />
          <Path d="M15 7h6v6" {...p} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={7} {...p} />
          <Line x1={21} y1={21} x2={16.2} y2={16.2} {...p} />
        </>
      )}
      {name === 'pencil' && (
        <>
          <Path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z" {...p} />
          <Line x1={13.5} y1={6.5} x2={17} y2={10} {...p} />
        </>
      )}
      {name === 'users' && (
        <>
          <Circle cx={9} cy={8} r={3.3} {...p} />
          <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" {...p} />
          <Path d="M15.5 5.3a3.3 3.3 0 0 1 0 6.4" {...p} />
          <Path d="M14.5 13.3A6.5 6.5 0 0 1 21.5 20" {...p} />
        </>
      )}
      {name === 'copy' && (
        <>
          <Rect x={8} y={8} width={12} height={12} rx={2.5} {...p} />
          <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" {...p} />
        </>
      )}
      {name === 'camera' && (
        <>
          <Path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z" {...p} />
          <Circle cx={12} cy={13.5} r={3.4} {...p} />
        </>
      )}
      {name === 'image' && (
        <>
          <Rect x={3} y={4} width={18} height={16} rx={2.5} {...p} />
          <Circle cx={9} cy={10} r={1.6} fill={color} stroke="none" />
          <Path d="M4.5 16.5l5-5 4 4 2.5-2.5 4.5 4.5" {...p} />
        </>
      )}
      {name === 'bolt' && <Path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" {...p} strokeLinejoin="round" />}
      {name === 'bell' && (
        <>
          <Path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" {...p} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...p} />
        </>
      )}
      {name === 'split' && (
        <>
          <Path d="M6 4v6a4 4 0 0 0 4 4h4" {...p} />
          <Path d="M14 10l4 4-4 4" {...p} />
          <Path d="M6 14v2a4 4 0 0 0 4 4" {...p} />
        </>
      )}
      {name === 'filter' && (
        <Path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z" {...p} strokeLinejoin="round" />
      )}
      {name === 'bars' && (
        <>
          <Line x1={5} y1={19} x2={5} y2={13} {...p} />
          <Line x1={12} y1={19} x2={12} y2={7} {...p} />
          <Line x1={19} y1={19} x2={19} y2={10} {...p} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x={5} y={11} width={14} height={10} rx={2.5} {...p} />
          <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} />
          <Circle cx={12} cy={16} r={1.4} fill={color} stroke="none" />
        </>
      )}
      {name === 'face-id' && (
        <>
          <Path d="M4 8V6a2 2 0 0 1 2-2h2" {...p} />
          <Path d="M20 8V6a2 2 0 0 0-2-2h-2" {...p} />
          <Path d="M4 16v2a2 2 0 0 0 2 2h2" {...p} />
          <Path d="M20 16v2a2 2 0 0 1-2 2h-2" {...p} />
          <Line x1={9} y1={10} x2={9} y2={11} {...p} />
          <Line x1={15} y1={10} x2={15} y2={11} {...p} />
          <Path d="M9 15c.7.7 1.8 1 3 1s2.3-.3 3-1" {...p} />
        </>
      )}
    </Svg>
  );
}
