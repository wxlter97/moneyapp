import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ListaTab } from '@/app/(app)/(tabs)/dashboard';
import type { Transaction } from '@/api/types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/components/AddTransactionFab', () => ({ AddTransactionFab: () => null }));

const mockMonth = jest.fn();
const mockSearch = jest.fn();
const mockTotals = jest.fn();
const mockFetchNext = jest.fn();

jest.mock('@/api/queries', () => ({
  useTransactions: (params: unknown, opts?: { enabled?: boolean }) => mockMonth(params, opts),
  useInfiniteTransactions: (params: unknown, opts?: { enabled?: boolean }) => mockSearch(params, opts),
  useTransactionTotals: (params: unknown, opts?: { enabled?: boolean }) => mockTotals(params, opts),
  useWallets: () => ({ data: [{ id: 'w1', name: 'Cuenta', currency: 'USD' }] }),
  useTags: () => ({ data: [] }),
  useDeleteTransaction: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/api/queries/lookups', () => ({
  ...jest.requireActual('@/api/queries/lookups'),
  useCategoryMap: () => ({ map: new Map([['c1', { id: 'c1', name: 'Comida', type: 'expense' }]]) }),
  useWalletMap: () => ({ map: new Map([['w1', { id: 'w1', name: 'Cuenta', currency: 'USD' }]]) }),
}));

const txn = (id: string, over: Partial<Transaction> = {}): Transaction =>
  ({
    id, type: 'expense', amount: '10.00', currency: 'USD', date: '2026-08-01', description: `Gasto ${id}`,
    wallet: 'w1', to_wallet: null, category: 'c1', counts_toward_budget: true, tags: [], ...over,
  }) as Transaction;

const idle = { data: undefined, isLoading: false, isError: false, isFetching: false, refetch: jest.fn() };
const searchResult = (rows: Transaction[], more: boolean) => ({
  ...idle,
  data: { pages: [{ count: rows.length, next: more ? 'n' : null, previous: null, results: rows }] },
  hasNextPage: more,
  isFetchingNextPage: false,
  fetchNextPage: mockFetchNext,
});

const month = { year: 2026, month: 8 } as never;

async function mount() {
  await render(<ListaTab month={month} onMonth={jest.fn()} currency="USD" />);
}
/** Escribe en el buscador; el debounce (300 ms) se espera con `findBy`/`waitFor` de cada test. */
async function typeSearch(text: string) {
  fireEvent.changeText(await screen.findByPlaceholderText('Buscar movimientos'), text);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMonth.mockReturnValue({ ...idle, data: [txn('m1'), txn('m2')] });
  mockSearch.mockReturnValue({ ...idle, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: mockFetchNext });
  mockTotals.mockReturnValue({ ...idle, data: [{ currency: 'USD', income: '0.00', expenses: '9999.00' }] });
});

describe('Historial: búsqueda paginada', () => {
  it('sin texto trabaja con el mes completo y no pide la búsqueda', async () => {
    await mount();
    expect(mockMonth).toHaveBeenLastCalledWith(
      { date_after: '2026-08-01', date_before: '2026-08-31' },
      { enabled: true },
    );
    expect(mockSearch).toHaveBeenLastCalledWith(expect.anything(), { enabled: false });
    expect(mockTotals).toHaveBeenLastCalledWith(expect.anything(), { enabled: false });
  });

  it('con texto busca en el servidor (sin rango de fechas) y deja quieto el mes', async () => {
    await mount();
    await typeSearch('super');
    await waitFor(() =>
      expect(mockSearch).toHaveBeenLastCalledWith({ search: 'super' }, { enabled: true }),
    );
    expect(mockMonth).toHaveBeenLastCalledWith(expect.anything(), { enabled: false });
  });

  it('el total de la búsqueda es el del servidor, no el de la página cargada', async () => {
    mockSearch.mockReturnValue(searchResult([txn('s1')], true));
    await mount();
    await typeSearch('super');
    // Gastos y neto: los dos salen de los 9,999.00 del servidor, no de los 10.00 de la fila.
    expect((await screen.findAllByText(/9,999\.00/)).length).toBeGreaterThan(0);
  });

  it('con más resultados ofrece «Cargar más»', async () => {
    mockSearch.mockReturnValue(searchResult([txn('s1')], true));
    await mount();
    await typeSearch('super');
    fireEvent.press(await screen.findByText('Cargar más'));
    expect(mockFetchNext).toHaveBeenCalledTimes(1);
  });

  it('sin texto nunca ofrece «Cargar más»', async () => {
    await mount();
    expect(screen.queryByText('Cargar más')).toBeNull();
  });

  it('una búsqueda sin resultados no dice «este mes»', async () => {
    mockSearch.mockReturnValue(searchResult([], false));
    await mount();
    await typeSearch('nadaquever');
    expect(await screen.findByText('Sin resultados')).toBeTruthy();
    expect(screen.queryByText('Sin movimientos este mes')).toBeNull();
  });
});
