/**
 * Tokens de tema en JS, espejo de `global.css` / `tailwind.config.js`. Úsalos
 * cuando necesites un color fuera de className (navegación de expo-router,
 * StatusBar, gráficos SVG, `trackColor` de Switch…).
 *
 * Para código dentro de React usa `useColors()` (reacciona al tema). El export
 * `colors` es el tema OSCURO, como fallback sincrónico donde no hay hook.
 *
 * Identidad wxlter. (Fase 3, sep 2026): neutros derivados de Tinta/Papel
 * (`#111111`/`#F4F3EF`, ver `assets/LEEME.txt`), acento elegible en
 * Herramientas → Apariencia (Faro `#FFDB00` por defecto, ver
 * `theme/accents.ts`). income/expense/warning son semántica fija —
 * independiente del acento a propósito: el acento es identidad, nunca
 * significa "bien" o "mal" (ver `BudgetMeter`).
 */
import { useColorScheme } from 'nativewind';

import { useAccentStore } from '@/store/accent';
import { resolveAccent } from './accents';

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
  bg: '#111111',
  surface: '#171717',
  surface2: '#202020',
  border: '#2A2A2A',
  text: '#F4F3EF',
  textMuted: '#8C8C86',
  primary: '#FFDB00',
  primaryFg: '#111111',
  income: '#4FC172',
  expense: '#E5503B',
  warning: '#E8873A',
};

export const lightColors: ThemeColors = {
  bg: '#F4F3EF',
  surface: '#FFFFFF',
  surface2: '#EDEBE3',
  border: '#DAD7CD',
  text: '#111111',
  textMuted: '#63625B',
  primary: '#FFDB00',
  primaryFg: '#111111',
  income: '#1F7A40',
  expense: '#C43D28',
  warning: '#B4631A',
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
  const customHex = useAccentStore((s) => s.customHex);
  const scheme = colorScheme === 'light' ? 'light' : 'dark';
  const base = scheme === 'light' ? lightColors : darkColors;
  const accent = resolveAccent(accentId, customHex)[scheme];
  return { ...base, primary: accent.primary, primaryFg: accent.primaryFg };
}

/** Ancho máximo del contenido en pantallas grandes (web desktop). */
export const MAX_CONTENT_WIDTH = 560;
