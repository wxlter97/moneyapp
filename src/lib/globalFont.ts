import { Text, TextInput } from 'react-native';

import { DEFAULT_FONT } from '@/theme/typography';

/**
 * Aplica Manrope como fuente por defecto a TODOS los `Text`/`TextInput` de
 * la app, sin tocar cada componente. RN no tiene cascada de `fontFamily`
 * (a diferencia de CSS), así que este es el atajo estándar: parchar
 * `defaultProps.style`, que React resuelve en cada render mientras el
 * prop `style` no lo pise explícitamente.
 *
 * Llamar una sola vez, DESPUÉS de que `useFonts` confirme que el archivo
 * ya está cargado (si se llama antes, el texto que ya montó no se
 * actualiza solo — por eso además esperamos a `fontsLoaded` para montar
 * el árbol real de la app en `_layout.tsx`).
 */
export function applyGlobalFont() {
  const T = Text as unknown as { defaultProps?: { style?: unknown } };
  T.defaultProps = T.defaultProps ?? {};
  T.defaultProps.style = [{ fontFamily: DEFAULT_FONT }, T.defaultProps.style];

  const TI = TextInput as unknown as { defaultProps?: { style?: unknown } };
  TI.defaultProps = TI.defaultProps ?? {};
  TI.defaultProps.style = [{ fontFamily: DEFAULT_FONT }, TI.defaultProps.style];
}
