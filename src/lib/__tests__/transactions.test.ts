import { act, renderHook } from '@testing-library/react-native';

import type { Transaction, TransactionType } from '@/api/types';
import {
  balanceAfterEach,
  groupByDay,
  signedAmount,
  summarizeByType,
  totalsForCurrency,
  useSwipeDeleteTransactions,
} from '../transactions';

const mockMutateAsync = jest.fn(async (_id: string) => ({}));
const mockShow = jest.fn();

jest.mock('@/api/queries', () => ({
  useDeleteTransaction: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock('@/store/snackbar', () => ({
  useSnackbarStore: (selector: (s: { show: typeof mockShow }) => unknown) =>
    selector({ show: mockShow }),
}));

const txn = (
  id: string,
  type: TransactionType,
  amount: string,
  date = '2026-08-01',
  toWallet: string | null = null,
): Transaction =>
  ({
    id,
    type,
    wallet: 'a',
    to_wallet: type === 'transfer' ? toWallet : null,
    category: type === 'transfer' ? null : 'c',
    amount,
    currency: 'USD',
    description: '',
    date,
    counts_toward_budget: true,
    source: 'manual',
    is_recurring: false,
    created_by: null,
    created_at: '',
    updated_at: '',
  }) as Transaction;

describe('summarizeByType', () => {
  it('separa ingresos y gastos por txn.type y calcula el neto', () => {
    const totals = summarizeByType([
      txn('1', 'income', '3200.00'),
      txn('2', 'expense', '46.30'),
      txn('3', 'expense', '12.00'),
    ]);
    expect(totals.income).toBeCloseTo(3200);
    expect(totals.expenses).toBeCloseTo(58.3);
    expect(totals.net).toBeCloseTo(3141.7);
  });

  it('ignora las transferencias', () => {
    const totals = summarizeByType([
      txn('1', 'expense', '10.00'),
      txn('2', 'transfer', '500.00'),
    ]);
    expect(totals.expenses).toBe(10);
    expect(totals.income).toBe(0);
  });

  it('lista vacía => todo en cero', () => {
    expect(summarizeByType([])).toEqual({ income: 0, expenses: 0, net: 0 });
  });
});

describe('groupByDay', () => {
  it('agrupa por fecha preservando el orden', () => {
    const sections = groupByDay([
      txn('1', 'expense', '1', '2026-08-31'),
      txn('2', 'expense', '2', '2026-08-31'),
      txn('3', 'expense', '3', '2026-08-30'),
    ]);
    expect(sections.map((s) => s.date)).toEqual(['2026-08-31', '2026-08-30']);
    expect(sections[0].data).toHaveLength(2);
    expect(sections[1].data).toHaveLength(1);
  });
});

describe('signedAmount', () => {
  it('ingreso suma, gasto resta', () => {
    expect(signedAmount(txn('1', 'income', '50.00'))).toBe(50);
    expect(signedAmount(txn('1', 'expense', '50.00'))).toBe(-50);
  });

  it('transferencia resta salvo que se mire desde la cartera destino', () => {
    const t = txn('1', 'transfer', '50.00', '2026-08-01', 'b');
    expect(signedAmount(t, 'a')).toBe(-50);
    expect(signedAmount(t, 'b')).toBe(50);
  });
});

describe('balanceAfterEach', () => {
  it('camina hacia atrás desde el saldo actual (más reciente primero)', () => {
    // Orden como lo entrega el API: más reciente primero.
    const items = [
      txn('3', 'expense', '20.00'),
      txn('2', 'income', '100.00'),
      txn('1', 'expense', '10.00'),
    ];
    // Saldo actual = -10 (t1) + 100 (t2) - 20 (t3) = 70.
    const balances = balanceAfterEach(items, 70, 'a');
    expect(balances.get('3')).toBe(70);
    expect(balances.get('2')).toBe(90);
    expect(balances.get('1')).toBe(-10);
  });

  it('respeta la perspectiva en una transferencia entrante', () => {
    const items = [txn('1', 'transfer', '30.00', '2026-08-01', 'b')];
    expect(balanceAfterEach(items, 30, 'b').get('1')).toBe(30);
    expect(balanceAfterEach(items, -30, 'a').get('1')).toBe(-30);
  });

  it('lista vacía => mapa vacío', () => {
    expect(balanceAfterEach([], 100, 'a').size).toBe(0);
  });
});

// Extiende el swipe-to-delete (antes solo en el dashboard) a
// wallet-transactions/category-transactions/tag-transactions vía este hook
// compartido. Regresión de paso: el snackbar es global y de un solo mensaje
// a la vez (`store/snackbar.ts`) -- un segundo swipe-delete mientras el
// primero seguía sin confirmar reemplazaba su snackbar en silencio, y ese
// primer borrado nunca se comprometía (quedaba oculto de la lista para
// siempre sin borrarse de verdad hasta reiniciar la app).
describe('useSwipeDeleteTransactions', () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
    mockShow.mockClear();
  });

  function lastSnackbarOptions() {
    return mockShow.mock.calls[mockShow.mock.calls.length - 1][0] as {
      onAction: () => void;
      onTimeout: () => void;
    };
  }

  it('oculta la fila al instante y muestra el snackbar con "Deshacer", sin borrar todavía', async () => {
    const { result } = await renderHook(() => useSwipeDeleteTransactions());
    await act(async () => result.current.onSwipeDelete('t1'));

    expect(result.current.pendingDeleteIds.has('t1')).toBe(true);
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Movimiento eliminado.', actionLabel: 'Deshacer' }),
    );
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('"Deshacer" restaura la fila sin llamar al DELETE', async () => {
    const { result } = await renderHook(() => useSwipeDeleteTransactions());
    await act(async () => result.current.onSwipeDelete('t1'));
    await act(async () => lastSnackbarOptions().onAction());

    expect(result.current.pendingDeleteIds.has('t1')).toBe(false);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('si nadie deshace (onTimeout), se llama al DELETE real', async () => {
    const { result } = await renderHook(() => useSwipeDeleteTransactions());
    await act(async () => result.current.onSwipeDelete('t1'));
    await act(async () => lastSnackbarOptions().onTimeout());

    expect(mockMutateAsync).toHaveBeenCalledWith('t1');
  });

  it('si el DELETE falla, restaura la fila en vez de perderla en silencio', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('network'));
    const { result } = await renderHook(() => useSwipeDeleteTransactions());
    await act(async () => result.current.onSwipeDelete('t1'));
    await act(async () => lastSnackbarOptions().onTimeout());

    expect(result.current.pendingDeleteIds.has('t1')).toBe(false);
  });

  it('un segundo swipe-delete compromete el anterior (que ya no tiene snackbar propio) en vez de perderlo', async () => {
    const { result } = await renderHook(() => useSwipeDeleteTransactions());
    await act(async () => result.current.onSwipeDelete('t1')); // snackbar #1, todavía sin resolver
    await act(async () => result.current.onSwipeDelete('t2')); // reemplaza el snackbar -- t1 se compromete acá

    expect(mockMutateAsync).toHaveBeenCalledWith('t1');
    expect(mockMutateAsync).not.toHaveBeenCalledWith('t2');
    // Ambas siguen ocultas: t1 porque ya se borró de verdad, t2 porque
    // todavía espera su propio "Deshacer".
    expect(result.current.pendingDeleteIds.has('t1')).toBe(true);
    expect(result.current.pendingDeleteIds.has('t2')).toBe(true);
  });
});

describe('totalsForCurrency', () => {
  const server = [
    { currency: 'USD', income: '1000.00', expenses: '250.50' },
    { currency: 'EUR', income: '0.00', expenses: '9.00' },
  ];
  const txn = (over: Partial<Transaction>) =>
    ({ id: 't', type: 'expense', amount: '10.00', currency: 'USD', ...over }) as Transaction;

  it('toma los totales de la moneda pedida', () => {
    expect(totalsForCurrency(server, 'USD')).toEqual({ income: 1000, expenses: 250.5, net: 749.5 });
    expect(totalsForCurrency(server, 'EUR').expenses).toBe(9);
  });

  it('sin datos del servidor o de esa moneda, cero', () => {
    expect(totalsForCurrency(undefined, 'USD')).toEqual({ income: 0, expenses: 0, net: 0 });
    expect(totalsForCurrency(server, 'GTQ').expenses).toBe(0);
  });

  it('resta las filas pendientes de deshacer, sólo de esa moneda', () => {
    const pending = [
      txn({ amount: '50.50' }),
      txn({ type: 'income', amount: '100.00' }),
      txn({ amount: '999.00', currency: 'EUR' }),
    ];
    expect(totalsForCurrency(server, 'USD', pending)).toEqual({
      income: 900,
      expenses: 200,
      net: 700,
    });
  });

  it('nunca baja de cero', () => {
    expect(totalsForCurrency(server, 'USD', [txn({ amount: '5000.00' })]).expenses).toBe(0);
  });
});
