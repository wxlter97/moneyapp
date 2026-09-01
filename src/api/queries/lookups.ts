import { useMemo } from 'react';

import type { Account, Category } from '@/api/types';
import { useAccounts, useCategories } from './index';

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

export function useAccountMap() {
  const q = useAccounts();
  const map = useMemo(() => {
    const m = new Map<string, Account>();
    for (const a of q.data ?? []) m.set(a.id, a);
    return m;
  }, [q.data]);
  return { map, query: q };
}

/** "Visa ···· 4242" o el nombre a secas. */
export function accountLabel(account: Account | undefined): string {
  if (!account) return '—';
  if (account.card_last4) return `${account.name} ···· ${account.card_last4}`;
  return account.name;
}
