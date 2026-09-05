/**
 * Tokens de tema en JS, espejo de `global.css` / `tailwind.config.js`. Úsalos
 * cuando necesites un color fuera de className (navegación de expo-router,
 * StatusBar, gráficos SVG, `trackColor` de Switch…).
 *
 * Para código dentro de React usa `useColors()` (reacciona al tema). El export
 * `colors` es el tema OSCURO, como fallback sincrónico donde no hay hook.
 *
 * Paleta neutra (gris frío, sin tinte cálido) con un solo acento tierra
 * (musgo por defecto, elegible en Herramientas → Apariencia, ver
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
  bg: '#0A0B0D',
  surface: '#17181C',
  surface2: '#1F2126',
  border: '#292B31',
  text: '#F4F4F6',
  textMuted: '#94969E',
  primary: '#6B8A5A',
  primaryFg: '#FFFFFF',
  income: '#7C9A6B',
  expense: '#C97B63',
  warning: '#C9A15A',
};

export const lightColors: ThemeColors = {
  bg: '#F6F6F8',
  surface: '#FFFFFF',
  surface2: '#F1F1F4',
  border: '#E7E7EC',
  text: '#16171A',
  textMuted: '#8E8E96',
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
