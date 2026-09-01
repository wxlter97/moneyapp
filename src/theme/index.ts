/**
 * Tokens de tema en JS, espejo de `tailwind.config.js`. Úsalos cuando necesites
 * un color fuera de className (navegación de expo-router, StatusBar, gráficos).
 */
export const colors = {
  bg: '#0B0D10',
  surface: '#15181D',
  surface2: '#1E232B',
  border: '#2A2F38',
  text: '#F2F4F7',
  textMuted: '#9AA4B2',
  primary: '#4F8CFF',
  primaryFg: '#FFFFFF',
  income: '#3ECF8E',
  expense: '#FF6B6B',
  warning: '#F5A623',
} as const;

/** Ancho máximo del contenido en pantallas grandes (web desktop). */
export const MAX_CONTENT_WIDTH = 560;
