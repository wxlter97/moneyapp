import type { AxiosAdapter } from 'axios';

import { api, clearTokens, setTokens } from '../client';
import { ai } from '../resources';
import { useWorkspaceStore } from '@/store/workspace';

function mockAdapter(data: any) {
  const calls: any[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    return { data, status: 200, statusText: '200', headers: {}, config } as any;
  };
  return { adapter, calls };
}

const RESPUESTA = {
  enabled: true,
  quotas: {
    receipt: { limit: 30, used: 4, remaining: 26 },
    parse: { limit: 50, used: 0, remaining: 50 },
    chat: { limit: 20, used: 20, remaining: 0 },
  },
  resets_at: '2026-10-01T00:00:00Z',
};

beforeEach(async () => {
  await setTokens({ access: 'ACCESS1', refresh: 'REFRESH1' });
  useWorkspaceStore.setState({ activeId: 'ws-123', workspaces: [], hydrated: true });
});

afterEach(async () => {
  await clearTokens();
  jest.clearAllMocks();
});

describe('ai.status', () => {
  it('no manda el header de workspace: la cuota es del usuario, no del presupuesto', async () => {
    const { adapter, calls } = mockAdapter(RESPUESTA);
    api.defaults.adapter = adapter;

    await ai.status();

    expect(calls[0].url).toBe('/ai/status/');
    expect(calls[0].headers['X-Workspace-ID']).toBeUndefined();
  });

  it('devuelve lo que queda de cada cuota', async () => {
    const { adapter } = mockAdapter(RESPUESTA);
    api.defaults.adapter = adapter;

    const status = await ai.status();

    expect(status.enabled).toBe(true);
    expect(status.quotas.receipt.remaining).toBe(26);
    expect(status.quotas.chat.remaining).toBe(0);
  });

  it('sin key en el backend, enabled viene en false y hay que esconder todo lo de IA', async () => {
    const { adapter } = mockAdapter({ ...RESPUESTA, enabled: false });
    api.defaults.adapter = adapter;

    expect((await ai.status()).enabled).toBe(false);
  });
});
