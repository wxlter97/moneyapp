/**
 * Tokens de tema en JS, espejo de `global.css` / `tailwind.config.js`. Úsalos
 * cuando necesites un color fuera de className (navegación de expo-router,
 * StatusBar, gráficos SVG, `trackColor` de Switch…).
 *
 * Para código dentro de React usa `useColors()` (reacciona al tema). El export
 * `colors` es el tema OSCURO, como fallback sincrónico donde no hay hook.
 *
 * Paleta neutra, cálida (piedra/papel, no gris frío) con un solo acento
 * tierra (musgo por defecto, elegible en Herramientas → Apariencia, ver
 * `theme/accents.ts`): sin colores de sección — el énfasis visual lo dan
 * la tipografía y las cards "glass", no el color.
 */
import { useColorScheme } from 'nativewind';

import { useAccentStore } from '@/store/accent';
import { getAccent } from './accents';

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
  bg: '#0C0B09',
  surface: '#1A1816',
  surface2: '#211F1C',
  border: '#332F2A',
  text: '#F5F3EF',
  textMuted: '#9C978E',
  primary: '#6B8A5A',
  primaryFg: '#FFFFFF',
  income: '#7C9A6B',
  expense: '#C97B63',
  warning: '#C9A15A',
};

export const lightColors: ThemeColors = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surface2: '#F2EFEA',
  border: '#E8E3DC',
  text: '#1A1815',
  textMuted: '#8F897E',
  primary: '#516B45',
  primaryFg: '#FFFFFF',
  income: '#4F7047',
  expense: '#B5573E',
  warning: '#96742E',
};

/** Fallback sincrónico (tema oscuro). Dentro de React preferí `useColors()`. */
export const colors = darkColors;

/**
 * Paleta activa: reacciona a claro/oscuro/sistema (`colorScheme`) y al
 * acento elegido (`useAccentStore`) — ambos son independientes. El acento
 * sólo pisa `primary`/`primaryFg`; el resto de la paleta no cambia.
 */
export function useColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  const accentId = useAccentStore((s) => s.accent);
  const scheme = colorScheme === 'light' ? 'light' : 'dark';
  const base = scheme === 'light' ? lightColors : darkColors;
  const accent = getAccent(accentId)[scheme];
  return { ...base, primary: accent.primary, primaryFg: accent.primaryFg };
}

/** Ancho máximo del contenido en pantallas grandes (web desktop). */
export const MAX_CONTENT_WIDTH = 560;
