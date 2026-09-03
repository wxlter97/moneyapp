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
