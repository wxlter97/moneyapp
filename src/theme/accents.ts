/**
 * Temas de color: sólo el acento (botones, selecciones, pill del nav) — los
 * fondos/superficies quedan iguales en los dos temas de claridad. Cada
 * acento trae su propio par claro/oscuro (el tono que se ve bien sobre
 * blanco no es el mismo que se ve bien sobre casi-negro).
 */
export type AccentId = 'blue' | 'purple' | 'teal' | 'pink' | 'orange';

interface AccentShade {
  primary: string;
  primaryFg: string;
}

export interface Accent {
  id: AccentId;
  label: string;
  light: AccentShade;
  dark: AccentShade;
}

export const ACCENTS: Accent[] = [
  {
    id: 'blue',
    label: 'Azul',
    light: { primary: '#3D74FA', primaryFg: '#FFFFFF' },
    dark: { primary: '#5B93FF', primaryFg: '#FFFFFF' },
  },
  {
    id: 'purple',
    label: 'Púrpura',
    light: { primary: '#6D4FEF', primaryFg: '#FFFFFF' },
    dark: { primary: '#A78BFA', primaryFg: '#FFFFFF' },
  },
  {
    id: 'teal',
    label: 'Verde azulado',
    light: { primary: '#0D9488', primaryFg: '#FFFFFF' },
    dark: { primary: '#2DD4BF', primaryFg: '#FFFFFF' },
  },
  {
    id: 'pink',
    label: 'Rosa',
    light: { primary: '#DB2777', primaryFg: '#FFFFFF' },
    dark: { primary: '#F472B6', primaryFg: '#FFFFFF' },
  },
  {
    id: 'orange',
    label: 'Naranja',
    light: { primary: '#C2410C', primaryFg: '#FFFFFF' },
    dark: { primary: '#FB923C', primaryFg: '#FFFFFF' },
  },
];

export const DEFAULT_ACCENT: AccentId = 'blue';

export function getAccent(id: AccentId): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

/** "#RRGGBB" → "R G B", el formato de las CSS vars en `global.css`. */
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Mezcla hacia blanco (0-1). Para el segundo tono del degradado del FAB. */
export function lighten(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
