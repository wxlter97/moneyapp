/**
 * Sistema tipográfico de la app: identidad wxlter. (Fase 3, sep 2026, ver
 * `assets/LEEME.txt`) — 3 roles fijos que NO se mezclan:
 *
 *  - `black`  (Archivo Black) — sólo la cifra protagonista de una pantalla
 *    (patrimonio neto, restante del período…). Nunca en párrafos, nunca en
 *    etiquetas. Un solo peso (la fuente no tiene variantes).
 *  - `fonts.*` (Archivo)      — toda la UI: nombres, botones, títulos de
 *    sección, cuerpo de texto. Es la fuente por defecto (`DEFAULT_FONT`).
 *  - `mono.*` (JetBrains Mono) — únicamente datos y metadata financiera:
 *    montos (`Money`), fechas, porcentajes. Nunca para etiquetas de UI.
 *
 * Se cargan con `useFonts` en el layout raíz. Por qué `style={{ fontFamily }}`
 * explícito y no una clase de Tailwind: nativewind resuelve `className` a
 * `style` a nivel de compilación/runtime; cuando lo hace, ese `style`
 * calculado gana por sobre cualquier default seteado vía `Text.defaultProps`
 * (ver `applyGlobalFont`, que igual lo dejamos como red de contención para
 * el puñado de `<Text>` sin `className`). Por eso los títulos, cifras
 * grandes, botones y la marca fijan `fontFamily` a mano — y por lo que RN
 * tampoco sintetiza pesos de forma confiable en iOS sobre una fuente
 * custom, cada peso vive en su propio archivo .ttf con su propio
 * `fontFamily`.
 */
export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
} as const;

/** Archivo Black: único peso, reservado a cifras protagonistas (`Money hero`). */
export const black = 'ArchivoBlack_400Regular';

/** JetBrains Mono: reservado a datos financieros (`Money`, fechas). */
export const mono = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  semibold: 'JetBrainsMono_600SemiBold',
} as const;

/** Fallback para `applyGlobalFont` (Text sin `className` ni `style` propio). */
export const DEFAULT_FONT = fonts.medium;
