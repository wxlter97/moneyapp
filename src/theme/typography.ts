import { Platform } from 'react-native';

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
 *
 * En web cada familia lleva además un respaldo del sistema: si el `.ttf`
 * tarda o falla, el navegador cae a una sans (o mono) en vez de a su fuente
 * por defecto, que en Safari es Times. En nativo el nombre va solo -- ahí
 * tiene que coincidir exacto con la clave registrada en `useFonts`.
 */
const withWebFallback = (family: string, fallback: string) =>
  Platform.OS === 'web' ? `${family}, ${fallback}` : family;
const sans = (family: string) => withWebFallback(family, 'system-ui, sans-serif');
const monospace = (family: string) => withWebFallback(family, 'ui-monospace, monospace');

export const fonts = {
  regular: sans('Archivo_400Regular'),
  medium: sans('Archivo_500Medium'),
  semibold: sans('Archivo_600SemiBold'),
  bold: sans('Archivo_700Bold'),
  extrabold: sans('Archivo_800ExtraBold'),
} as const;

/** Archivo Black: único peso, reservado a cifras protagonistas (`Money hero`). */
export const black = sans('ArchivoBlack_400Regular');

/** JetBrains Mono: reservado a datos financieros (`Money`, fechas). */
export const mono = {
  regular: monospace('JetBrainsMono_400Regular'),
  medium: monospace('JetBrainsMono_500Medium'),
  semibold: monospace('JetBrainsMono_600SemiBold'),
} as const;

/** Fallback para `applyGlobalFont` (Text sin `className` ni `style` propio). */
export const DEFAULT_FONT = fonts.medium;
