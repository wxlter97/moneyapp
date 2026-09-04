/**
 * Familia tipográfica de la app: Manrope (geométrica, cálida, mucho más
 * "diseñada" que la fuente de sistema). Se carga con `useFonts` en el
 * layout raíz.
 *
 * IMPORTANTE — por qué se aplica con `style={{ fontFamily }}` explícito y no
 * como clase de Tailwind: nativewind resuelve `className` a `style` a nivel
 * de compilación/runtime; cuando lo hace, ese `style` calculado gana por
 * sobre cualquier default seteado vía `Text.defaultProps` (ver
 * `applyGlobalFont`, que igual lo dejamos como red de contención para el
 * puñado de `<Text>` sin `className`). Por eso los títulos, cifras grandes,
 * botones y la marca fijan `fontFamily` a mano — y por lo que RN tampoco
 * sintetiza pesos de forma confiable en iOS sobre una fuente custom, cada
 * peso vive en su propio archivo .ttf con su propio `fontFamily`.
 */
export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/** Fallback para `applyGlobalFont` (Text sin `className` ni `style` propio). */
export const DEFAULT_FONT = fonts.medium;
