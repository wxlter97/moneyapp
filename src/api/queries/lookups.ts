import { useMemo } from 'react';

import type { Category, Wallet } from '@/api/types';
import { useCategories, useWallets } from './index';

/** Mapa id -> Category, para resolver nombres en listas de transacciones. */
export function useCategoryMap() {
  const q = useCategories();
  const map = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of q.data ?? []) m.set(c.id, c);
    return m;
  }, [q.data]);
  return { map, query: q };
}

export function useWalletMap() {
  const q = useWallets();
  const map = useMemo(() => {
    const m = new Map<string, Wallet>();
    for (const w of q.data ?? []) m.set(w.id, w);
    return m;
  }, [q.data]);
  return { map, query: q };
}

/** "Visa ···· 4242" o el nombre a secas. */
export function walletLabel(wallet: Wallet | undefined): string {
  if (!wallet) return '—';
  if (wallet.card_last4) return `${wallet.name} ···· ${wallet.card_last4}`;
  return wallet.name;
}
