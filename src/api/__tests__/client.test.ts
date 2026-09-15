import type { AxiosAdapter } from 'axios';

import { api, clearTokens, setTokens } from '../client';
import { tokenStorage } from '../tokenStorage';
import { useWorkspaceStore } from '@/store/workspace';

/** Adapter falso: captura la config y devuelve lo que le digamos. */
function mockAdapter(handler: (url: string, config: any) => { status: number; data?: any }) {
  const calls: any[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    const { status, data } = handler(config.url ?? '', config);
    const response = {
      data: data ?? {},
      status,
      statusText: String(status),
      headers: {},
      config,
    };
    if (status >= 400) return Promise.reject(Object.assign(new Error('http'), { response, config }));
    return response as any;
  };
  return { adapter, calls };
}

beforeEach(async () => {
  await setTokens({ access: 'ACCESS1', refresh: 'REFRESH1' });
  useWorkspaceStore.setState({ activeId: 'ws-123', workspaces: [], hydrated: true });
});

afterEach(async () => {
  await clearTokens();
  jest.clearAllMocks();
});

describe('header X-Workspace-ID', () => {
  it('se adjunta en endpoints scoped junto con el Bearer', async () => {
    const { adapter, calls } = mockAdapter(() => ({ status: 200, data: { results: [] } }));
    api.defaults.adapter = adapter;

    await api.get('/wallets/');

    expect(calls[0].headers.Authorization).toBe('Bearer ACCESS1');
    expect(calls[0].headers['X-Workspace-ID']).toBe('ws-123');
  });

  it('NO se adjunta en /workspaces/ ni /auth/*', async () => {
    const { adapter, calls } = mockAdapter(() => ({ status: 200 }));
    api.defaults.adapter = adapter;

    await api.get('/workspaces/');
    await api.get('/auth/me/');

    expect(calls[0].headers['X-Workspace-ID']).toBeUndefined();
    expect(calls[1].headers['X-Workspace-ID']).toBeUndefined();
  });

  it('se omite con skipWorkspace: true', async () => {
    const { adapter, calls } = mockAdapter(() => ({ status: 200 }));
    api.defaults.adapter = adapter;

    await api.get('/wallets/', { skipWorkspace: true });

    expect(calls[0].headers['X-Workspace-ID']).toBeUndefined();
  });
});

describe('refresh automático ante 401', () => {
  it('refresca, reintenta la request original y usa el access nuevo', async () => {
    let firstCall = true;
    const { adapter, calls } = mockAdapter((url) => {
      if (url.includes('/auth/token/refresh/')) {
        return { status: 200, data: { access: 'ACCESS2' } };
      }
      if (url.includes('/wallets/') && firstCall) {
        firstCall = false;
        return { status: 401 };
      }
      return { status: 200, data: { ok: true } };
    });
    api.defaults.adapter = adapter;

    const res = await api.get('/wallets/');

    expect(res.data).toEqual({ ok: true });
    const retry = calls.find((c, i) => i > 0 && c.url === '/wallets/');
    expect(retry.headers.Authorization).toBe('Bearer ACCESS2');
  });

  // Regresión real (14 sep 2026): con ROTATE_REFRESH_TOKENS activo en el
  // backend, otra pestaña/ventana de la misma sesión puede rotar el
  // refresh token antes que ésta. Si esta pestaña reintenta con el que
  // recuerda en memoria (ya invalidado por el backend), el refresh falla y
  // desloguea una sesión que en realidad seguía viva -- "pide iniciar
  // sesión más seguido" / "al navegar deberían seguir activas".
  it('relee el refresh token de storage antes de reintentar (no usa uno viejo de otra pestaña)', async () => {
    // Simula: otra pestaña ya rotó el token -- storage tiene el nuevo, pero
    // el módulo `client.ts` de ESTA "pestaña" (este test) todavía recuerda
    // el viejo en memoria, seteado por `setTokens` en el `beforeEach`.
    // `jest.spyOn` (no `tokenStorage.save`): bajo jest, `Platform.OS` no es
    // 'web' -- `tokenStorage` usa el mock sin estado de `expo-secure-store`
    // (`getItemAsync` siempre devuelve `null`), así que guardar de verdad
    // no alcanzaría para que un `get()` posterior lo vea.
    jest.spyOn(tokenStorage, 'get').mockResolvedValueOnce({
      access: 'ACCESS_FROM_OTHER_TAB',
      refresh: 'REFRESH2',
    });

    let firstCall = true;
    const { adapter, calls } = mockAdapter((url, config) => {
      if (url.includes('/auth/token/refresh/')) {
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        expect(body.refresh).toBe('REFRESH2');
        return { status: 200, data: { access: 'ACCESS3' } };
      }
      if (url.includes('/wallets/') && firstCall) {
        firstCall = false;
        return { status: 401 };
      }
      return { status: 200, data: { ok: true } };
    });
    api.defaults.adapter = adapter;

    const res = await api.get('/wallets/');

    expect(res.data).toEqual({ ok: true });
    const retry = calls.find((c, i) => i > 0 && c.url === '/wallets/');
    expect(retry.headers.Authorization).toBe('Bearer ACCESS3');
  });
});
