import { QUERY_CACHE_KEY, setLocalItemEvicting, webStorage } from '../kvStorage';

/** `localStorage` falso con tope de caracteres, como el real. */
function installFakeLocalStorage(limit: number) {
  const data = new Map<string, string>();
  const used = () => [...data].reduce((n, [k, v]) => n + k.length + v.length, 0);
  const fake = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const next = used() - (data.has(k) ? k.length + data.get(k)!.length : 0) + k.length + v.length;
      if (next > limit) throw new DOMException('quota', 'QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
  return data;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('setLocalItemEvicting', () => {
  it('guarda normal cuando hay espacio', () => {
    const data = installFakeLocalStorage(1_000);
    expect(setLocalItemEvicting('a', 'hola')).toBe(true);
    expect(data.get('a')).toBe('hola');
  });

  it('si no cabe, libera la caché de consultas y guarda (el token no se pierde)', () => {
    const data = installFakeLocalStorage(1_000);
    data.set(QUERY_CACHE_KEY, 'x'.repeat(900));
    expect(setLocalItemEvicting('budget.jwt.access', 'y'.repeat(200))).toBe(true);
    expect(data.has(QUERY_CACHE_KEY)).toBe(false);
    expect(data.get('budget.jwt.access')).toHaveLength(200);
  });

  it('nunca borra otra cosa que no sea la caché de consultas', () => {
    const data = installFakeLocalStorage(1_000);
    data.set('budget.workspace', 'w'.repeat(500));
    expect(setLocalItemEvicting('otro', 'z'.repeat(800))).toBe(false);
    expect(data.get('budget.workspace')).toHaveLength(500);
  });

  it('si la que no cabe es la propia caché, la descarta junto con la copia anterior', () => {
    const data = installFakeLocalStorage(1_000);
    data.set(QUERY_CACHE_KEY, 'x'.repeat(100));
    data.set('budget.jwt.access', 'y'.repeat(850));
    expect(setLocalItemEvicting(QUERY_CACHE_KEY, 'n'.repeat(500))).toBe(false);
    expect(data.has(QUERY_CACHE_KEY)).toBe(false);
    expect(data.get('budget.jwt.access')).toHaveLength(850);
  });

  it('si el storage está bloqueado no lanza', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
        removeItem: () => { throw new Error('blocked'); },
      },
    });
    expect(setLocalItemEvicting('a', 'b')).toBe(false);
  });
});

describe('webStorage', () => {
  it('setItem con cuota llena no lanza (los stores de zustand siguen andando)', async () => {
    const data = installFakeLocalStorage(100);
    data.set(QUERY_CACHE_KEY, 'x'.repeat(90));
    await expect(webStorage.setItem('ui', 'y'.repeat(50))).resolves.toBeUndefined();
    expect(data.get('ui')).toHaveLength(50);
  });
});
