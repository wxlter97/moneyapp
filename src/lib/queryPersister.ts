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
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import type { Query } from '@tanstack/react-query';

import { asyncKVStorage, QUERY_CACHE_KEY } from '@/store/kvStorage';

/**
 * Tope de la caché persistida, en caracteres. `localStorage` da ~5 M por origen y
 * lo comparten los stores y los tokens de sesión, así que la caché se queda en
 * menos de la mitad. Una transacción serializada pesa ~0,9 KB: ~2 000 filas en
 * total, sumando todas las consultas guardadas (y la misma transacción sale en
 * varias: mes, cartera, etiqueta, categoría).
 */
export const QUERY_CACHE_BUDGET = 2_000_000;

interface DehydratedQuery {
  state: { data?: unknown };
}

/** Deja de un `useInfiniteQuery` sólo la primera página: al restaurar, la lista
 * pinta lo más reciente al instante y el resto se pide de nuevo al desplazarse. */
function firstPageOnly(query: DehydratedQuery): DehydratedQuery {
  const data = query.state.data as { pages?: unknown[]; pageParams?: unknown[] } | undefined;
  if (!data || !Array.isArray(data.pages) || data.pages.length <= 1) return query;
  return {
    ...query,
    state: {
      ...query.state,
      data: { ...data, pages: data.pages.slice(0, 1), pageParams: (data.pageParams ?? []).slice(0, 1) },
    },
  };
}

/**
 * Reduce lo que se guarda para no toparse con la cuota de `localStorage`: las
 * listas paginadas quedan en su primera página y, si aun así se pasa de
 * `budget`, se descartan las consultas más pesadas hasta que entre. Lo que se
 * descarta no se pierde: sólo se vuelve a bajar del servidor.
 */
export function trimPersistedClient(
  client: PersistedClient,
  budget: number = QUERY_CACHE_BUDGET,
): PersistedClient {
  const queries = (client.clientState.queries as unknown as DehydratedQuery[]).map(firstPageOnly);
  const sizes = queries.map((q) => JSON.stringify(q).length);
  let total = sizes.reduce((a, b) => a + b, 0);
  const keep = queries.map(() => true);
  // Del más pesado al más liviano: con pocas consultas grandes se cumple el tope
  // descartando muy pocas, y las chicas (lo que más se lee) casi nunca se tocan.
  const bySize = sizes.map((size, i) => ({ size, i })).sort((a, b) => b.size - a.size);
  for (const { size, i } of bySize) {
    if (total <= budget) break;
    keep[i] = false;
    total -= size;
  }
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: queries.filter((_, i) => keep[i]) as never,
    },
  };
}

export const queryPersister = createAsyncStoragePersister({
  storage: asyncKVStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 1_000,
  serialize: (client) => JSON.stringify(trimPersistedClient(client)),
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
