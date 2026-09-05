import { Text, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { useColors } from '@/theme';
import { muteColor } from '@/theme/accents';

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
 * Avatar de categoría: emoji (o ícono genérico) sobre un fondo neutro
 * (`bg-surface-2`) — nunca el color de la categoría relleno o en degradado
 * detrás del glyph. Se probaron ambas variantes y quedaban con demasiado
 * color a la vez en pantallas con varias categorías juntas (rejilla,
 * listas) — lejos del look "premium" que se busca. El color de la
 * categoría queda como un punto discreto en la esquina (o tiñendo el
 * ícono genérico cuando no hay emoji): alcanza para distinguir, sin
 * competir con el contenido.
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
  const dotSize = Math.min(16, Math.max(10, Math.round(size * 0.3)));
  // El color es libre (lo elige la persona usuaria al crear la categoría):
  // se atenúa siempre al pintarlo, para que sea un detalle discreto y no un
  // bloque de color vivo — ver `muteColor`.
  const muted = muteColor(color);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <View
        style={{ width: size, height: size, borderRadius: size }}
        className={`items-center justify-center bg-surface-2 ${
          selected ? 'border-2 border-primary' : ''
        }`}
      >
        {icon ? (
          <Text style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.15 }}>{icon}</Text>
        ) : (
          <Icon name={fallbackIcon} size={iconSize} color={muted || colors.textMuted} />
        )}
      </View>
      {muted ? (
        <View
          pointerEvents="none"
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-surface"
          style={{ width: dotSize, height: dotSize, backgroundColor: muted }}
        />
      ) : null}
    </View>
  );
}
