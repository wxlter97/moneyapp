/**
 * Persistencia de la caché de React Query entre arranques de la app.
 *
 * Sin esto, cada vez que se abre la app (o se recarga la pestaña web) todas
 * las pantallas arrancan en loading así los datos no hayan cambiado desde la
 * última vez. Con esto: se pinta al instante lo último que había en caché
 * (`asyncKVStorage` -- AsyncStorage en nativo, `localStorage` en web) y por
 * detrás React Query revalida contra el servidor (stale-while-revalidate).
 *
 * No se persisten los recibos (`receiptImage`): son data URIs en base64,
 * pueden pesar varios MB por transacción y ya tienen `staleTime: Infinity`
 * -- no aporta nada guardarlos y hincha el storage.
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';

import { asyncKVStorage } from '@/store/kvStorage';

export const queryPersister = createAsyncStoragePersister({
  storage: asyncKVStorage,
  key: 'budget-query-cache',
  throttleTime: 1_000,
});

/** 24h: mismo horizonte que `gcTime` en `queryClient.ts`. */
export const QUERY_PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false;
  const key = query.queryKey;
  return !(Array.isArray(key) && key.includes('receipt'));
}
