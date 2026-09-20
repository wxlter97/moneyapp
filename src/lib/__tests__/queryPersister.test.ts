import type { Query } from '@tanstack/react-query';

import { AI_QUERY_PREFIX, shouldPersistQuery } from '../queryPersister';

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
});
