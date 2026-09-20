import { QUERY_CACHE_KEY } from '@/store/kvStorage';

function fakeStorage(limit: number) {
  const data = new Map<string, string>();
  const used = () => [...data].reduce((n, [k, v]) => n + k.length + v.length, 0);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        const prev = data.has(k) ? k.length + data.get(k)!.length : 0;
        if (used() - prev + k.length + v.length > limit) throw new DOMException('q', 'QuotaExceededError');
        data.set(k, v);
      },
      removeItem: (k: string) => void data.delete(k),
    },
  });
  return data;
}

function loadWeb() {
  let mod!: typeof import('../tokenStorage');
  jest.isolateModules(() => {
    // Dentro del aislamiento `react-native` es otra instancia: se le pone 'web' a ésa.
    const { Platform } = require('react-native');
    Platform.OS = 'web';
    mod = require('../tokenStorage');
  });
  return mod.tokenStorage;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('tokenStorage (web) con el almacenamiento lleno', () => {
  it('libera la caché de consultas para guardar la sesión', async () => {
    const data = fakeStorage(1_000);
    data.set(QUERY_CACHE_KEY, 'x'.repeat(950));
    await loadWeb().save({ access: 'a'.repeat(100), refresh: 'r'.repeat(100) });
    expect(data.has(QUERY_CACHE_KEY)).toBe(false);
    expect(await loadWeb().get()).toEqual({ access: 'a'.repeat(100), refresh: 'r'.repeat(100) });
  });

  it('si ni así cabe, avisa con un error claro en vez de perder la sesión en silencio', async () => {
    fakeStorage(50);
    await expect(loadWeb().save({ access: 'a'.repeat(100), refresh: 'r' })).rejects.toThrow(
      /almacenamiento lleno/,
    );
  });
});
