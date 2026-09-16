import { Pressable, View, type ColorValue, type PressableProps } from 'react-native';

import { haptics } from '@/lib/haptics';
import { Icon, type IconName } from './Icon';

// Apple HIG / Material recomiendan 44x44 (iOS) / 48x48 (Android) como área
// táctil mínima -- muchos botones de sólo ícono en la app son visualmente
// más chicos que eso (32x32, 24x24...) por diseño, así que se completa la
// diferencia con `hitSlop` en vez de agrandar el círculo/ícono en sí.
const MIN_TOUCH_TARGET = 44;

interface IconButtonProps extends Omit<PressableProps, 'children' | 'style' | 'hitSlop'> {
  icon: IconName;
  /** Tamaño visual del botón (el círculo/cuadrado que se ve), en px. */
  size?: number;
  iconSize?: number;
  color?: ColorValue;
  /** Clases del contenedor visual (fondo, `rounded-full`, etc.) -- el
   * tamaño va aparte, en `size`, para poder calcular el `hitSlop`. */
  className?: string;
  accessibilityLabel: string;
}

/** Botón de un solo ícono con área táctil mínima de 44x44 sin importar qué
 * tan chico se vea -- usar en vez de un `Pressable` + `Icon` a mano para
 * cualquier acción de ícono suelto (editar, cerrar, más opciones...). */
export function IconButton({
  icon,
  size = 32,
  iconSize,
  color,
  className = '',
  disabled,
  onPress,
  accessibilityLabel,
  ...rest
}: IconButtonProps) {
  const hitSlop = Math.max(0, Math.ceil((MIN_TOUCH_TARGET - size) / 2));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={(e) => {
        if (disabled) return;
        haptics.tap();
        onPress?.(e);
      }}
      {...rest}
    >
      <View
        className={`items-center justify-center ${className} ${disabled ? 'opacity-50' : ''}`}
        style={{ width: size, height: size }}
      >
        <Icon name={icon} size={iconSize ?? Math.round(size * 0.45)} color={color} />
      </View>
    </Pressable>
  );
}
