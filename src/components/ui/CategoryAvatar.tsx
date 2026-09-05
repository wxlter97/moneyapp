import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, type IconName } from './Icon';
import { useColors } from '@/theme';

interface CategoryAvatarProps {
  /** Emoji de la categoría, si tiene. */
  icon?: string | null;
  /** Color de la categoría (hex), si tiene. */
  color?: string | null;
  /** Ícono a mostrar cuando no hay emoji. */
  fallbackIcon?: IconName;
  /** Diámetro del círculo, en px. */
  size: number;
  /** Anillo de selección (rejilla de categorías). */
  selected?: boolean;
}

/**
 * Avatar de categoría: emoji (o ícono genérico) sobre un degradado suave del
 * color de la categoría — nunca el color a pleno relleno detrás del glyph
 * (eso daba mal contraste según el emoji). El degradado va de un tono más
 * saturado en una esquina a casi transparente en la opuesta, sobre una base
 * neutra (`bg-surface-2`) que sigue asomando por abajo: da la sensación de
 * "vidrio teñido" en vez de una ficha de color plano, y mantiene el fondo lo
 * bastante neutro como para no comprometer la legibilidad del emoji.
 *
 * Se probó primero un halo (varios círculos concéntricos alrededor, sin
 * blur real): en la rejilla de 4 columnas se veía como un ojo de buey, no
 * como un degradado. `LinearGradient` (ya usado en el FAB) da un resultado
 * mucho más prolijo y 100% consistente entre iOS/Android/web.
 */
export function CategoryAvatar({
  icon,
  color,
  fallbackIcon = 'tag',
  size,
  selected = false,
}: CategoryAvatarProps) {
  const colors = useColors();
  const emojiSize = Math.round(size * 0.42);
  const iconSize = Math.round(size * 0.38);

  const content = icon ? (
    <Text style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.15 }}>{icon}</Text>
  ) : (
    <Icon name={fallbackIcon} size={iconSize} color={color || colors.textMuted} />
  );

  if (!color) {
    return (
      <View
        style={{ width: size, height: size, borderRadius: size }}
        className={`items-center justify-center bg-surface-2 ${
          selected ? 'border-2 border-primary' : ''
        }`}
      >
        {content}
      </View>
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size, overflow: 'hidden' }}
      className={selected ? 'border-2 border-primary' : ''}
    >
      <View style={{ width: size, height: size }} className="bg-surface-2">
        <LinearGradient
          colors={[`${color}80`, `${color}0D`]}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.85, y: 0.95 }}
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          {content}
        </LinearGradient>
      </View>
    </View>
  );
}
