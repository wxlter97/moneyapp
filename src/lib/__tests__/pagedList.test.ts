import { renderHook } from '@testing-library/react-native';

import type { Paginated } from '@/api/types';
import { flattenPages, usePagedScroll } from '@/lib/pagedList';

const page = (results: number[], next: string | null = null): Paginated<number> => ({
  count: 0,
  next,
  previous: null,
  results,
});

const scrollEvent = (offsetY: number, contentHeight = 3000, viewHeight = 800) =>
  ({
    nativeEvent: {
      contentOffset: { x: 0, y: offsetY },
      contentSize: { width: 400, height: contentHeight },
      layoutMeasurement: { width: 400, height: viewHeight },
    },
  }) as never;

async function setup(over: Partial<Parameters<typeof usePagedScroll<number>>[0]> = {}) {
  const fetchNextPage = jest.fn();
  const query = {
    data: { pages: [page([1, 2], 'next')] },
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage,
    ...over,
  };
  const { result } = await renderHook(() => usePagedScroll(query));
  return { result, fetchNextPage };
}

describe('flattenPages', () => {
  it('une las páginas en orden', () => {
    expect(flattenPages({ pages: [page([1, 2]), page([3])] })).toEqual([1, 2, 3]);
  });

  it('sin datos devuelve una lista vacía', () => {
    expect(flattenPages(undefined)).toEqual([]);
  });
});

describe('usePagedScroll', () => {
  it('pide la página siguiente al acercarse al final', async () => {
    const { result, fetchNextPage } = await setup();
    result.current.onScroll(scrollEvent(1800)); // faltan 400 px
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('no pide nada si todavía queda mucho por recorrer', async () => {
    const { result, fetchNextPage } = await setup();
    result.current.onScroll(scrollEvent(100));
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('no pide otra página mientras hay una en camino', async () => {
    const { result, fetchNextPage } = await setup({ isFetchingNextPage: true });
    result.current.onScroll(scrollEvent(2200));
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('no pide nada cuando ya se cargó todo', async () => {
    const { result, fetchNextPage } = await setup({ hasNextPage: false });
    result.current.onScroll(scrollEvent(2200));
    result.current.loadMore();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('loadMore (el botón de respaldo) pide la siguiente', async () => {
    const { result, fetchNextPage } = await setup();
    result.current.loadMore();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
