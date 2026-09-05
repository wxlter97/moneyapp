/**
 * Temas de color: sólo el acento (botones, selecciones, pill del nav) — los
 * fondos/superficies quedan iguales en los dos temas de claridad. Cada
 * acento trae su propio par claro/oscuro (el tono que se ve bien sobre
 * blanco no es el mismo que se ve bien sobre casi-negro).
 *
 * Paleta "tierra": tonos de baja saturación (musgo, arcilla, piedra, arena,
 * tinta) en vez de los colores saturados de antes — el objetivo es un look
 * premium y monocromático con acentos discretos, no vivos.
 */
export type AccentId = 'moss' | 'clay' | 'stone' | 'sand' | 'ink' | 'navy' | 'ember';

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
    id: 'moss',
    label: 'Musgo',
    light: { primary: '#516B45', primaryFg: '#FFFFFF' },
    dark: { primary: '#6B8A5A', primaryFg: '#FFFFFF' },
  },
  {
    id: 'clay',
    label: 'Arcilla',
    light: { primary: '#8B4A32', primaryFg: '#FFFFFF' },
    dark: { primary: '#B8714C', primaryFg: '#FFFFFF' },
  },
  {
    id: 'stone',
    label: 'Piedra',
    light: { primary: '#4A5560', primaryFg: '#FFFFFF' },
    dark: { primary: '#7C8A97', primaryFg: '#FFFFFF' },
  },
  {
    id: 'sand',
    label: 'Arena',
    light: { primary: '#7A5C2E', primaryFg: '#FFFFFF' },
    dark: { primary: '#A17F49', primaryFg: '#FFFFFF' },
  },
  {
    id: 'ink',
    label: 'Tinta',
    light: { primary: '#33363D', primaryFg: '#FFFFFF' },
    dark: { primary: '#6B7280', primaryFg: '#FFFFFF' },
  },
  {
    id: 'navy',
    label: 'Navy',
    // Mismos tonos del splash de la app: azul marino profundo en claro,
    // el celeste de la marca sobre el fondo casi negro en oscuro.
    light: { primary: '#1D3461', primaryFg: '#FFFFFF' },
    dark: { primary: '#5B93FF', primaryFg: '#FFFFFF' },
  },
  {
    id: 'ember',
    label: 'Brasa',
    // Único acento deliberadamente vivo (a pedido): rojo intenso sobre
    // negro puro, la misma vibra que un fondo de brasas encendidas —
    // rompe la regla "tierra apagada" del resto de la paleta a propósito.
    light: { primary: '#C1121F', primaryFg: '#FFFFFF' },
    dark: { primary: '#FF4B36', primaryFg: '#FFFFFF' },
  },
];

export const DEFAULT_ACCENT: AccentId = 'moss';

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

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

/**
 * Reduce la saturación de un color hex arbitrario (el de una cartera o
 * categoría, elegido libremente por la persona usuaria) para que se lea
 * como un acento discreto — un dato para diferenciar, no un bloque de
 * color vivo — sin perder el matiz que lo distingue de los demás.
 */
export function muteColor(hex: string | null | undefined, satScale = 0.3): string | null {
  if (!hex) return null;
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, Math.max(0, s * satScale), l);
  const toHex = (c: number) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}
