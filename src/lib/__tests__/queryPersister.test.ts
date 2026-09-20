import type { Query } from '@tanstack/react-query';

import { AI_QUERY_PREFIX, shouldPersistQuery, trimPersistedClient } from '../queryPersister';

/** Un `Query` mínimo: `shouldPersistQuery` sólo mira el estado y la key. */
function query(queryKey: unknown, status: 'success' | 'pending' | 'error' = 'success'): Query {
  return { queryKey, state: { status } } as unknown as Query;
}

describe('shouldPersistQuery', () => {
  it('persiste una query normal que terminó bien', () => {
    expect(shouldPersistQuery(query(['ws', 'abc', 'transactions']))).toBe(true);
  });

  it('no persiste lo que no terminó bien', () => {
    expect(shouldPersistQuery(query(['ws', 'abc', 'wallets'], 'pending'))).toBe(false);
    expect(shouldPersistQuery(query(['ws', 'abc', 'wallets'], 'error'))).toBe(false);
  });

  it('no persiste los recibos (data URIs de varios MB)', () => {
    expect(shouldPersistQuery(query(['ws', 'abc', 'transactions', 't1', 'receipt']))).toBe(false);
  });

  it('no persiste el estado de la IA: si no, al abrir la pantalla los botones se pintan con la copia vieja y desaparecen cuando llega la respuesta fresca', () => {
    expect(AI_QUERY_PREFIX).toBe('ai');
    expect(shouldPersistQuery(query(['ai', 'status']))).toBe(false);
  });

  it('el prefijo de IA sólo cuenta al inicio de la key: una key que lo contiene no se pierde', () => {
    expect(shouldPersistQuery(query(['ws', 'abc', 'ai']))).toBe(true);
  });

  it('no persiste el resumen de recompensas: una copia vieja mostraría "sin recompensas" hasta que llegue la fresca', () => {
    expect(shouldPersistQuery(query(['ws', 'abc', 'loyalty-summary', {}]))).toBe(false);
    expect(shouldPersistQuery(query(['ws', 'abc', 'wallets']))).toBe(true);
  });
});

describe('trimPersistedClient', () => {
  const q = (key: string, data: unknown) => ({ queryKey: [key], queryHash: key, state: { data, status: 'success' } });
  const client = (queries: unknown[]) =>
    ({ timestamp: 1, buster: '', clientState: { mutations: [], queries } }) as never;
  const keys = (c: { clientState: { queries: unknown[] } }) =>
    (c.clientState.queries as { queryHash: string }[]).map((x) => x.queryHash);

  it('deja intacto lo que cabe en el tope', () => {
    const c = client([q('a', [1, 2, 3]), q('b', { x: 1 })]);
    expect(trimPersistedClient(c, 10_000)).toEqual(c);
  });

  it('una lista paginada queda sólo con su primera página', () => {
    const paged = { pages: [{ results: [1] }, { results: [2] }, { results: [3] }], pageParams: [0, 50, 100] };
    const out = trimPersistedClient(client([q('lista', paged)]), 10_000);
    const data = (out.clientState.queries[0] as { state: { data: typeof paged } }).state.data;
    expect(data.pages).toEqual([{ results: [1] }]);
    expect(data.pageParams).toEqual([0]);
  });

  it('pasado el tope descarta primero las consultas más pesadas', () => {
    const big = 'x'.repeat(5_000);
    const c = client([q('chica', 'a'), q('grande', big), q('mediana', big.slice(0, 1_000))]);
    const out = trimPersistedClient(c, 2_000);
    expect(keys(out)).toEqual(['chica', 'mediana']);
  });

  it('el resultado siempre entra en el tope si hay con qué', () => {
    const many = Array.from({ length: 50 }, (_, i) => q(`k${i}`, 'y'.repeat(1_000)));
    const out = trimPersistedClient(client(many), 10_000);
    expect(JSON.stringify(out.clientState.queries).length).toBeLessThanOrEqual(10_000);
    expect(out.clientState.queries.length).toBeGreaterThan(0);
  });

  it('no toca los mutations ni la marca de tiempo', () => {
    const c = { timestamp: 42, buster: 'v', clientState: { mutations: [{ m: 1 }], queries: [] } } as never;
    const out = trimPersistedClient(c, 10);
    expect(out.timestamp).toBe(42);
    expect(out.clientState.mutations).toEqual([{ m: 1 }]);
  });
});
