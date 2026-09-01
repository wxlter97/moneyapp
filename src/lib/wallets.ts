import type { Wallet, WalletPurpose } from '@/api/types';
import { WALLET_PURPOSES } from '@/api/types';

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
