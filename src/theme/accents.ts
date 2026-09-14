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
export type AccentId =
  | 'wxlter'
  | 'moss'
  | 'clay'
  | 'stone'
  | 'sand'
  | 'ink'
  | 'navy'
  | 'ember'
  | 'custom';

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
    id: 'wxlter',
    label: 'wxlter.',
    // Faro #FFDB00 -- identidad de marca, no un acento "tierra" más: por
    // eso rompe el patrón de par claro/oscuro de abajo (es lo bastante
    // brillante para leerse igual de bien sobre Papel que sobre Tinta, sin
    // necesitar un tono distinto por esquema). primaryFg siempre casi-negro:
    // blanco sobre este amarillo no pasa contraste.
    light: { primary: '#FFDB00', primaryFg: '#111111' },
    dark: { primary: '#FFDB00', primaryFg: '#111111' },
  },
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

export const DEFAULT_ACCENT: AccentId = 'wxlter';

/** Punto de partida del color picker la primera vez que se abre (mismo tono
 * que "wxlter.", el acento por defecto -- así no arranca en un color al azar). */
export const DEFAULT_CUSTOM_HEX = '#FFDB00';

export function getAccent(id: AccentId): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** Valida y normaliza un hex tipeado a mano ("#abc123", "ABC123"…) a
 * "#RRGGBB" mayúsculas, o `null` si no son 6 dígitos hex válidos. */
export function normalizeHex(hex: string): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return rgbToHex(rgb);
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (c: number) => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Luminancia relativa (WCAG): decide si el texto encima va casi-negro o blanco. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function foregroundFor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#FFFFFF';
  return relativeLuminance(rgb) > 0.55 ? '#16171A' : '#FFFFFF';
}

/**
 * Acento "Personalizado": a partir de un hex elegido libremente en el color
 * picker (`ColorPickerAccent`), deriva un par claro/oscuro tan legible como
 * los de la paleta fija -- toma el matiz y la saturación del hex elegido,
 * pero fija la luminosidad en una banda seleccionada por esquema (no la que
 * trajera el hex tal cual), el mismo motivo por el que cada acento fijo de
 * arriba trae su propio tono claro y oscuro en vez de reusar uno solo.
 */
export function buildCustomAccent(hex: string): Accent {
  const rgb = parseHex(hex) ?? (parseHex(DEFAULT_CUSTOM_HEX) as [number, number, number]);
  const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const lightPrimary = rgbToHex(hslToRgb(h, s, 0.38));
  const darkPrimary = rgbToHex(hslToRgb(h, s, 0.62));
  return {
    id: 'custom',
    label: 'Personalizado',
    light: { primary: lightPrimary, primaryFg: foregroundFor(lightPrimary) },
    dark: { primary: darkPrimary, primaryFg: foregroundFor(darkPrimary) },
  };
}

/**
 * Como `getAccent`, pero resuelve `'custom'` contra el hex guardado en
 * `useAccentStore`. Los llamadores que ya conocen el acento activo
 * (`useColors()`, las CSS vars de `app/_layout.tsx`) deben usar ésta y no
 * `getAccent` directo -- si no, un acento `'custom'` cae de vuelta a moss
 * (primer elemento de `ACCENTS`, ver arriba).
 */
export function resolveAccent(id: AccentId, customHex?: string | null): Accent {
  if (id === 'custom') return buildCustomAccent(customHex ?? DEFAULT_CUSTOM_HEX);
  return getAccent(id);
}

/** Matiz (0-360) de un hex, para ubicar el cursor del slider del color
 * picker sobre el hex actual (`AccentColorPicker`). Hex inválido → 0. */
export function hueOf(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return rgbToHsl(rgb[0], rgb[1], rgb[2])[0];
}

/** Hex de vista previa para un matiz dado: satura­ción y luminosidad fijas
 * (mismas que usa `buildCustomAccent` como punto de partida), sólo varía el
 * matiz -- es lo que arrastrar el slider de `AccentColorPicker` produce. */
export function hueToPreviewHex(hue: number): string {
  return rgbToHex(hslToRgb(((hue % 360) + 360) % 360, 0.55, 0.45));
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
