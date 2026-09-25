import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CategoryTransactionsScreen from '@/app/(app)/category-transactions';
import TagTransactionsScreen from '@/app/(app)/tag-transactions';
import WalletTransactionsScreen from '@/app/(app)/wallet-transactions';
import type { Transaction } from '@/api/types';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/components/WalletRewardsCard', () => ({ WalletRewardsCard: () => null }));

const mockInfinite = jest.fn();
const mockTotals = jest.fn();
const mockFetchNext = jest.fn();
const mockPeriod = jest.fn();

jest.mock('@/api/queries', () => ({
  useInfiniteTransactions: (params: unknown) => mockInfinite(params),
  useTransactionTotals: (params: unknown) => mockTotals(params),
  useWallet: () => ({ data: { id: 'w1', name: 'Cuenta', current_balance: '500.00', currency: 'USD' } }),
  useWalletPeriodSummary: (id: unknown, from: string, to: string) => mockPeriod(id, from, to),
  useTags: () => ({ data: [{ id: 'tag1', name: 'Viaje' }] }),
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

function pages(rows: Transaction[], more: boolean, extra: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ count: rows.length, next: more ? 'n' : null, previous: null, results: rows }] },
    isLoading: false, isError: false, isFetching: false,
    hasNextPage: more, isFetchingNextPage: false, fetchNextPage: mockFetchNext, refetch: jest.fn(),
    ...extra,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { wallet: 'w1', tag: 'tag1', category: 'c1', from: '2026-08-01', to: '2026-08-31' };
  mockTotals.mockReturnValue({ data: [{ currency: 'USD', income: '3000.00', expenses: '1234.50' }] });
  mockPeriod.mockImplementation((_id: unknown, from: string, to: string) => ({
    data: {
      date_after: from, date_before: to,
      opening_balance: '650.00', inflows: '0.00', outflows: '150.00', closing_balance: '500.00', count: 2,
      previous: { date_after: '2026-01-01', date_before: '2026-01-31', inflows: '0.00', outflows: '100.00' },
    },
    refetch: jest.fn(),
  }));
});

describe.each([
  ['cartera', WalletTransactionsScreen],
  ['etiqueta', TagTransactionsScreen],
  ['categoría', CategoryTransactionsScreen],
])('pantalla de %s', (_name, Screen) => {
  it('con más páginas ofrece «Cargar más» y lo pide al tocarlo', async () => {
    mockInfinite.mockReturnValue(pages([txn('a'), txn('b')], true));
    await render(<Screen />);
    fireEvent.press(await screen.findByText('Cargar más'));
    expect(mockFetchNext).toHaveBeenCalledTimes(1);
  });

  it('cuando ya se cargó todo no muestra «Cargar más»', async () => {
    mockInfinite.mockReturnValue(pages([txn('a')], false));
    await render(<Screen />);
    expect(screen.queryByText('Cargar más')).toBeNull();
  });
});

describe('totales del servidor', () => {
  it('etiqueta: el total es el del servidor, no la suma de lo cargado', async () => {
    mockInfinite.mockReturnValue(pages([txn('a', { amount: '10.00' })], true));
    await render(<TagTransactionsScreen />);
    expect(await screen.findByText(/1,234\.50/)).toBeTruthy();
    expect(mockTotals).toHaveBeenCalledWith({ tag: 'tag1' });
  });

  it('categoría: manda al servidor el rango y «cuenta para el presupuesto»', async () => {
    mockInfinite.mockReturnValue(pages([txn('a')], false));
    await render(<CategoryTransactionsScreen />);
    const filters = { category: 'c1', date_after: '2026-08-01', date_before: '2026-08-31', counts_toward_budget: true };
    expect(mockInfinite).toHaveBeenCalledWith(filters);
    expect(mockTotals).toHaveBeenCalledWith(filters);
  });

  it('categoría: «Todo el período» quita el rango pero conserva el filtro de presupuesto', async () => {
    mockInfinite.mockReturnValue(pages([txn('a')], false));
    await render(<CategoryTransactionsScreen />);
    fireEvent.press(await screen.findByText('Todo el período'));
    await waitFor(() =>
      expect(mockInfinite).toHaveBeenLastCalledWith({ category: 'c1', counts_toward_budget: true }),
    );
  });
});

describe('cartera', () => {
  it('por mes: extracto del mes y saldo de cada fila contado desde el cierre del mes', async () => {
    mockInfinite.mockReturnValue(
      pages([txn('a', { amount: '100.00' }), txn('b', { amount: '50.00' })], true),
    );
    await render(<WalletTransactionsScreen />);
    expect(await screen.findByText('Saldo inicial')).toBeTruthy();
    expect(screen.getByText('Saldo final')).toBeTruthy();
    // Salidas 150 vs. 100 el mes anterior.
    expect(screen.getByText('+50%')).toBeTruthy();
    const params = mockInfinite.mock.calls.at(-1)?.[0] as Record<string, string>;
    expect(params.date_after).toBeTruthy();
    expect(params.date_before).toBeTruthy();
  });

  it('«Todo»: cada fila muestra su saldo, contado desde el saldo actual', async () => {
    mockInfinite.mockReturnValue(
      pages([txn('a', { amount: '100.00' }), txn('b', { amount: '50.00' })], true),
    );
    await render(<WalletTransactionsScreen />);
    await fireEvent.press(await screen.findByText('Todo'));
    await waitFor(() => expect(mockInfinite).toHaveBeenLastCalledWith({ wallet: 'w1' }));
    // saldo tras la más reciente = 500; tras la siguiente = 500 + 100 (gasto) = 600
    expect(await screen.findByText(/500\.00/)).toBeTruthy();
    expect(screen.getByText(/600\.00/)).toBeTruthy();
  });
});
