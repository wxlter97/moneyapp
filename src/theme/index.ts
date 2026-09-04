/**
 * Tokens de tema en JS, espejo de `global.css` / `tailwind.config.js`. Úsalos
 * cuando necesites un color fuera de className (navegación de expo-router,
 * StatusBar, gráficos SVG, `trackColor` de Switch…).
 *
 * Para código dentro de React usa `useColors()` (reacciona al tema). El export
 * `colors` es el tema OSCURO, como fallback sincrónico donde no hay hook.
 */
import { useColorScheme } from 'nativewind';

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryFg: string;
  income: string;
  expense: string;
  warning: string;
}

export const darkColors: ThemeColors = {
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
};

export const lightColors: ThemeColors = {
  bg: '#F7F7F5',
  surface: '#FFFFFF',
  surface2: '#EEF0F4',
  border: '#E1E4EA',
  text: '#14181F',
  textMuted: '#5B6470',
  primary: '#2F6CE9',
  primaryFg: '#FFFFFF',
  income: '#169E67',
  expense: '#D6363C',
  warning: '#B07416',
};

/** Fallback sincrónico (tema oscuro). Dentro de React preferí `useColors()`. */
export const colors = darkColors;

/** Paleta activa según el tema. Reacciona a los cambios de `colorScheme`. */
export function useColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'light' ? lightColors : darkColors;
}

/** Ancho máximo del contenido en pantallas grandes (web desktop). */
export const MAX_CONTENT_WIDTH = 560;

// ---------------------------------------------------------------------------
// Acentos por sección (estilo Buddy)
// ---------------------------------------------------------------------------
export type SectionKey = 'overview' | 'budget' | 'wallets';

interface Section {
  key: SectionKey;
  label: string;
  /** Tinte plano (iconos, chips, indicadores). */
  tint: string;
  /** Paradas del degradado de cabecera `[from, to]`. */
  gradient: readonly [string, string];
}

export const sections: Record<SectionKey, Section> = {
  overview: {
    key: 'overview',
    label: 'Vista general',
    tint: '#7C5CFC',
    gradient: ['#5B3FD6', '#9B7BFF'],
  },
  budget: {
    key: 'budget',
    label: 'Presupuesto',
    tint: '#2FBF71',
    gradient: ['#1F9D5B', '#3ED88A'],
  },
  wallets: {
    key: 'wallets',
    label: 'Carteras',
    tint: '#F0568F',
    gradient: ['#D63D77', '#FF7FB0'],
  },
} as const;

/** Degradado `[from, to]` de una sección, listo para un `LinearGradient`. */
export function sectionGradient(key: SectionKey): readonly [string, string] {
  return sections[key].gradient;
}
