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

/**
 * Carteras que se le pueden cargar movimientos: excluye las que agrupan a
 * otras (tienen hijas) -- esas son puramente un contenedor, su saldo
 * mostrado es la suma de sus hijas, el backend rechaza cualquier
 * transacción/recurrente/compra a plazo cargada directo ahí (ver
 * `_reject_if_group_wallet`). Para elegir SIEMPRE la lista completa
 * (p. ej. al asignar `parent` en el formulario de cartera), usá
 * `useWallets()` directo.
 */
export function useAssignableWallets() {
  const q = useWallets();
  const wallets = useMemo(() => {
    const all = q.data ?? [];
    const groupIds = new Set(all.filter((w) => w.parent).map((w) => w.parent as string));
    return all.filter((w) => !groupIds.has(w.id));
  }, [q.data]);
  return { data: wallets, query: q };
}
