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

/**
 * Prefijo de las queries de IA (`['ai', 'status']`, ver `qk.aiStatus`): **no se
 * persisten nunca**. Dicen si la función está encendida, y eso lo puede cambiar
 * un interruptor del admin en cualquier momento. Restaurada del disco, la copia
 * vieja pintaba los botones de IA al abrir la pantalla y desaparecían apenas
 * llegaba la respuesta fresca -- un parpadeo que además hace creer que la
 * función anda. Sin copia, los botones aparecen sólo cuando el servidor confirmó
 * que la función está encendida.
 */
export const AI_QUERY_PREFIX = 'ai';

export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false;
  const key = query.queryKey;
  if (!Array.isArray(key)) return true;
  if (key.includes('receipt')) return false;
  // Lo ganado cambia con cada gasto y con el catálogo del servidor: una copia vieja
  // restaurada del disco mostraría "sin recompensas" hasta que llegue la fresca.
  if (key.includes('loyalty-summary')) return false;
  return key[0] !== AI_QUERY_PREFIX;
}
