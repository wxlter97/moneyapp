import type { Wallet, WalletPurpose } from '@/api/types';
import { WALLET_PURPOSES } from '@/api/types';
import { muteColor } from '@/theme/accents';

/** Paleta de colores para carteras: amplia y con matices claramente
 * distintos entre sí (antes eran 10 tonos que, ya atenuados, se confundían).
 * Cada color lleva nombre para poder distinguirlo y mencionarlo. Un color
 * que no está acá (guardado antes, o uno personalizado) se muestra como
 * "Personalizado". */
export const WALLET_COLOR_OPTIONS: { hex: string; name: string }[] = [
  { hex: '#EF4444', name: 'Rojo' },
  { hex: '#F97316', name: 'Naranja' },
  { hex: '#F5B700', name: 'Amarillo' },
  { hex: '#84CC16', name: 'Lima' },
  { hex: '#22C55E', name: 'Verde' },
  { hex: '#14B8A6', name: 'Turquesa' },
  { hex: '#06B6D4', name: 'Cian' },
  { hex: '#38BDF8', name: 'Celeste' },
  { hex: '#3B82F6', name: 'Azul' },
  { hex: '#4F46E5', name: 'Índigo' },
  { hex: '#8B5CF6', name: 'Violeta' },
  { hex: '#D946EF', name: 'Fucsia' },
  { hex: '#EC4899', name: 'Rosa' },
  { hex: '#92400E', name: 'Marrón' },
  { hex: '#94A3B8', name: 'Gris' },
  { hex: '#334155', name: 'Grafito' },
];

/** Nombre del color de la paleta, o `null` si es personalizado / no hay. */
export function walletColorName(hex: string | null | undefined): string | null {
  if (!hex) return null;
  return WALLET_COLOR_OPTIONS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? null;
}

/** Cuánto se atenúa la saturación al pintar una cartera: poco, para que los
 * colores sigan siendo bien distintos entre sí (el 0.3 de `muteColor` por
 * defecto los dejaba casi grises). */
export const WALLET_MUTE = 0.85;

const PURPOSE_FALLBACK: Record<WalletPurpose, string> = {
  spending: '#4F8CFF',
  savings: '#3ECF8E',
  debt: '#FF6B6B',
  asset: '#7C5CFC',
};

/** Color de acento de una cartera: el propio, o el de su `purpose` —
 * apenas atenuado (ver `WALLET_MUTE`). */
export function walletColor(wallet: Wallet): string {
  const raw = wallet.color || PURPOSE_FALLBACK[wallet.purpose] || '#94A3B8';
  return muteColor(raw, WALLET_MUTE) ?? raw;
}

export interface WalletNode {
  wallet: Wallet;
  depth: number;
  hasChildren: boolean;
}

/**
 * Aplana el árbol de carteras en orden de visualización: cada raíz seguida de
 * sus descendientes (DFS), con `depth` para la indentación.
 */
export function flattenTree(wallets: Wallet[]): WalletNode[] {
  const byParent = new Map<string | null, Wallet[]>();
  for (const w of wallets) {
    const key = w.parent;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(w);
  }
  const ids = new Set(wallets.map((w) => w.id));

  const out: WalletNode[] = [];
  const walk = (w: Wallet, depth: number) => {
    const children = byParent.get(w.id) ?? [];
    out.push({ wallet: w, depth, hasChildren: children.length > 0 });
    for (const c of children) walk(c, depth + 1);
  };

  // raíces = sin parent, o con un parent que no está en la lista visible
  for (const w of wallets) {
    if (w.parent === null || !ids.has(w.parent)) walk(w, 0);
  }
  return out;
}

export interface PurposeGroup {
  purpose: WalletPurpose;
  nodes: WalletNode[];
}

/** Agrupa las carteras por `purpose` (en el orden canónico) y arma el árbol de cada grupo. */
export function groupByPurpose(wallets: Wallet[]): PurposeGroup[] {
  return WALLET_PURPOSES.map((purpose) => ({
    purpose,
    nodes: flattenTree(wallets.filter((w) => w.purpose === purpose)),
  })).filter((g) => g.nodes.length > 0);
}
