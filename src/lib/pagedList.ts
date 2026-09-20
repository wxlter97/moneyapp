import { useCallback } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import type { Paginated } from '@/api/types';

/** Cuánto antes del final se pide la página siguiente, en px. */
const LOAD_MORE_DISTANCE = 600;

interface PagedQuery<T> {
  data?: { pages: Paginated<T>[] };
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

/** Une las páginas de un `useInfiniteQuery` en una sola lista (el orden ya viene del servidor). */
export function flattenPages<T>(data: { pages: Paginated<T>[] } | undefined): T[] {
  return data ? data.pages.flatMap((p) => p.results) : [];
}

/**
 * Scroll infinito para un `ScrollView`: devuelve el `onScroll` que pide la
 * página siguiente al acercarse al final, y `loadMore` para el botón de respaldo
 * (`LoadMoreFooter`). No pide nada mientras ya hay una página en camino.
 */
export function usePagedScroll<T>(query: PagedQuery<T>) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (contentSize.height - (contentOffset.y + layoutMeasurement.height) < LOAD_MORE_DISTANCE) {
        loadMore();
      }
    },
    [loadMore],
  );

  return { onScroll, scrollEventThrottle: 200, loadMore };
}
