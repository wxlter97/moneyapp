import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LoyaltyScreen from '@/screens/LoyaltyScreen';
import LoyaltyWalletScreen from '@/screens/LoyaltyWalletScreen';
import LoyaltyRedeemScreen from '@/screens/LoyaltyRedeemScreen';
import LoyaltyAdjustScreen from '@/screens/LoyaltyAdjustScreen';
import type { LoyaltyMovement, LoyaltySummary, LoyaltyWalletBalance } from '@/api/types';

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/components/ProFeatureGate', () => ({
  ProFeatureGate: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/lib/modal', () => ({ dismissModal: jest.fn() }));

const mockSummary = jest.fn();
const mockMovements = jest.fn();
const mockEarnings = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/api/queries', () => ({
  useLoyaltySummary: () => mockSummary(),
  useLoyaltyMovements: () => mockMovements(),
  useLoyaltyEarnings: () => mockEarnings(),
  useCreateLoyaltyMovement: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateLoyaltyMovement: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteLoyaltyMovement: () => ({ mutateAsync: mockRemove, isPending: false }),
  useWallets: () => ({ data: [{ id: 'w-bank', name: 'Cuenta', currency: 'USD', card_last4: null }] }),
}));

const points = (over = {}) => ({
  program: 'p-pts', name: 'Puntos Bancoagrícola', kind: 'points' as const, unit: 'points' as const,
  is_active: true, earned: '1000.00', adjusted: '0.00', redeemed: '0.00', available: '1000.00',
  point_value: '0.005', estimated_value: '5.00', min_amount: null, ...over,
});
const cashback = (over = {}) => ({
  program: 'p-cb', name: 'Cashback', kind: 'cashback' as const, unit: 'currency' as const,
  is_active: true, earned: '20.00', adjusted: '0.00', redeemed: '0.00', available: '20.00',
  point_value: null, estimated_value: '20.00', min_amount: '10.00', ...over,
});
const card = (over: Partial<LoyaltyWalletBalance> = {}): LoyaltyWalletBalance => ({
  wallet: 'w1', wallet_name: 'Dorada', currency: 'USD', bank: 'b-agricola', bank_name: 'Banco Agrícola',
  product_name: 'Tarjeta Dorada Visa', programs: [points()], discount_saved: '0.00', total_value: '5.00', ...over,
});
const summaryOf = (wallets: LoyaltyWalletBalance[]): { data: LoyaltySummary; isLoading: false; isError: false; isFetching: false; refetch: jest.Mock } => ({
  data: { wallets, points_balances: [], period_totals: [] }, isLoading: false, isError: false, isFetching: false, refetch: jest.fn(),
});

beforeEach(() => {
  mockPush.mockReset();
  mockCreate.mockReset().mockResolvedValue({});
  mockUpdate.mockReset().mockResolvedValue({});
  mockRemove.mockReset().mockResolvedValue(undefined);
  mockMovements.mockReturnValue({ data: [], isLoading: false, refetch: jest.fn() });
  mockEarnings.mockReturnValue({ data: [], isLoading: false, refetch: jest.fn() });
  mockParams = {};
});

describe('Recompensas (lista)', () => {
  it('agrupa las tarjetas por banco, sin mezclarlas, y muestra el total arriba', async () => {
    mockSummary.mockReturnValue(
      summaryOf([
        card({ wallet: 'a', wallet_name: 'Dorada', total_value: '5.00' }),
        card({ wallet: 'b', wallet_name: 'Amex Blue', bank: 'b-bac', bank_name: 'BAC', product_name: 'American Express Blue', programs: [cashback()], total_value: '20.00' }),
        card({ wallet: 'c', wallet_name: 'Platinum', total_value: '7.50' }),
      ]),
    );
    await render(<LoyaltyScreen />);
    expect(screen.getByText('Disponible ahora')).toBeTruthy();
    expect(screen.getByText('Banco Agrícola')).toBeTruthy();
    expect(screen.getByText('BAC')).toBeTruthy();
    // 5 + 20 + 7.5 = 32.50 entre las tres tarjetas
    expect(screen.getAllByText(/32\.50/).length).toBeGreaterThan(0);
    expect(screen.getByText(/de 3 tarjetas/)).toBeTruthy();
  });

  it('tocar una tarjeta abre las recompensas de esa tarjeta', async () => {
    mockSummary.mockReturnValue(summaryOf([card({ wallet: 'w-xyz' })]));
    await render(<LoyaltyScreen />);
    await fireEvent.press(screen.getByLabelText('Recompensas de Dorada'));
    expect(mockPush).toHaveBeenCalledWith('/loyalty/w-xyz');
  });

  it('avisa cuando hay puntos sin valor de canje que no entran en el total', async () => {
    mockSummary.mockReturnValue(
      summaryOf([card({ programs: [points({ point_value: null, estimated_value: null })], total_value: '0.00' })]),
    );
    await render(<LoyaltyScreen />);
    expect(screen.getByText(/no tiene valor de canje/)).toBeTruthy();
  });

  it('sin tarjetas con recompensas explica cómo empezar', async () => {
    mockSummary.mockReturnValue(summaryOf([]));
    await render(<LoyaltyScreen />);
    expect(screen.getByText(/Todavía no tienes tarjetas con recompensas/)).toBeTruthy();
  });
});

describe('Recompensas de una tarjeta', () => {
  beforeEach(() => {
    mockParams = { wallet: 'w1' };
  });

  it('muestra lo ganado, ajustado y canjeado, y la compra mínima', async () => {
    mockSummary.mockReturnValue(summaryOf([card({ programs: [cashback({ redeemed: '5.00', available: '15.00' })] })]));
    await render(<LoyaltyWalletScreen />);
    expect(screen.getByText('Ganado')).toBeTruthy();
    expect(screen.getByText('Canjeado')).toBeTruthy();
    expect(screen.getByText(/Sólo gana en compras desde/)).toBeTruthy();
  });

  it('Canjear y Ajustar llevan a su pantalla con la tarjeta y el programa', async () => {
    mockSummary.mockReturnValue(summaryOf([card()]));
    await render(<LoyaltyWalletScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Canjear' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/loyalty/redeem', params: { wallet: 'w1', program: 'p-pts' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Ajustar' }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/loyalty/adjust', params: { wallet: 'w1', program: 'p-pts' } });
  });

  it('no se puede canjear lo que no hay', async () => {
    mockSummary.mockReturnValue(summaryOf([card({ programs: [points({ available: '0.00' })] })]));
    await render(<LoyaltyWalletScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Canjear' }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('deshacer un canje depositado pide confirmación y avisa que también borra el ingreso', async () => {
    mockSummary.mockReturnValue(summaryOf([card()]));
    const movement: LoyaltyMovement = {
      id: 'm1', wallet: 'w1', program: 'p-pts', program_name: 'Puntos', kind: 'redeem', delta: '-200.00',
      cash_value: '1.00', date: '2026-09-20', note: 'Vuelo', deposit_transaction: 't1', created_at: '',
    };
    mockMovements.mockReturnValue({ data: [movement], isLoading: false, refetch: jest.fn() });
    await render(<LoyaltyWalletScreen />);
    await fireEvent.press(screen.getByText('Deshacer'));
    expect(screen.getByText(/también se elimina el ingreso/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sí, deshacer' }));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('m1'));
  });

  it('lista lo que ganó cada compra', async () => {
    mockSummary.mockReturnValue(summaryOf([card()]));
    mockEarnings.mockReturnValue({
      data: [{ id: 'e1', transaction: 't', transaction_description: 'Selectos', transaction_date: '2026-09-19', wallet: 'w1', program: 'p-pts', program_name: 'Puntos', kind: 'points', points: '42.00', amount: null, original_amount: null, saved_amount: null }],
      isLoading: false, refetch: jest.fn(),
    });
    await render(<LoyaltyWalletScreen />);
    expect(screen.getByText('Selectos')).toBeTruthy();
    expect(screen.getByText(/\+42 pts/)).toBeTruthy();
  });
});

describe('Canjear', () => {
  beforeEach(() => {
    mockParams = { wallet: 'w1', program: 'p-pts' };
    mockSummary.mockReturnValue(summaryOf([card()]));
  });

  it('no deja canjear más de lo disponible', async () => {
    await render(<LoyaltyRedeemScreen />);
    await fireEvent.changeText(screen.getByLabelText('Puntos a canjear'), '5000');
    expect(screen.getByRole('button', { name: 'Canjear' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Puntos a canjear'), '400');
    expect(screen.getByRole('button', { name: 'Canjear' })).not.toBeDisabled();
    expect(screen.getByText(/te quedan 600 pts/)).toBeTruthy();
  });

  it('propone el valor en dinero con el valor de canje y manda el canje sin depositar', async () => {
    await render(<LoyaltyRedeemScreen />);
    await fireEvent.changeText(screen.getByLabelText('Puntos a canjear'), '400');
    // 400 x 0.005 = 2.00
    expect(screen.getByLabelText(/Lo que valió en dinero/).props.value).toBe('2.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Canjear' }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet: 'w1', program: 'p-pts', kind: 'redeem', quantity: '400.00', cash_value: '2.00', deposit_wallet: null,
        }),
      ),
    );
  });

  it('el valor en dinero corregido a mano se respeta', async () => {
    await render(<LoyaltyRedeemScreen />);
    await fireEvent.changeText(screen.getByLabelText('Puntos a canjear'), '400');
    await fireEvent.changeText(screen.getByLabelText(/Lo que valió en dinero/), '2.50');
    await fireEvent.changeText(screen.getByLabelText('Puntos a canjear'), '500');
    expect(screen.getByLabelText(/Lo que valió en dinero/).props.value).toBe('2.50');
  });

  it('Canjear todo llena el disponible', async () => {
    await render(<LoyaltyRedeemScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Canjear todo' }));
    expect(screen.getByLabelText('Puntos a canjear').props.value).toBe('1000');
  });

  it('un error del servidor se muestra', async () => {
    mockCreate.mockRejectedValue(new Error('Sólo tienes 3 disponible.'));
    await render(<LoyaltyRedeemScreen />);
    await fireEvent.changeText(screen.getByLabelText('Puntos a canjear'), '10');
    await fireEvent.press(screen.getByRole('button', { name: 'Canjear' }));
    await waitFor(() => expect(screen.getByText(/Sólo tienes 3 disponible/)).toBeTruthy());
  });
});

describe('Ajustar', () => {
  beforeEach(() => {
    mockParams = { wallet: 'w1', program: 'p-pts' };
    mockSummary.mockReturnValue(summaryOf([card()]));
  });

  it('"Fijar en" calcula la diferencia contra el disponible de hoy', async () => {
    await render(<LoyaltyAdjustScreen />);
    await fireEvent.changeText(screen.getByLabelText(/Disponible correcto/), '1250');
    expect(screen.getByText(/Ajuste de \+250 pts/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar ajuste' }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'adjust', quantity: '250.00', wallet: 'w1', program: 'p-pts' }),
      ),
    );
  });

  it('restar más de lo que hay no se puede', async () => {
    await render(<LoyaltyAdjustScreen />);
    await fireEvent.press(screen.getByText('Restar'));
    await fireEvent.changeText(screen.getByLabelText(/Cuánto restar/), '5000');
    expect(screen.getByText(/no puede quedar en negativo/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar ajuste' })).toBeDisabled();
  });

  it('sin cambio no hay nada que ajustar', async () => {
    await render(<LoyaltyAdjustScreen />);
    await fireEvent.changeText(screen.getByLabelText(/Disponible correcto/), '1000');
    expect(screen.getByText(/No hay nada que ajustar/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar ajuste' })).toBeDisabled();
  });

  it('editar un ajuste precarga su cantidad y guarda con signo', async () => {
    mockParams = { wallet: 'w1', program: 'p-pts', movement: 'm9' };
    mockSummary.mockReturnValue(summaryOf([card({ programs: [points({ available: '1050.00', adjusted: '50.00' })] })]));
    mockMovements.mockReturnValue({
      data: [{ id: 'm9', wallet: 'w1', program: 'p-pts', program_name: 'Puntos', kind: 'adjust', delta: '50.00', cash_value: null, date: '2026-09-01', note: 'antes', deposit_transaction: null, created_at: '' }],
      isLoading: false, refetch: jest.fn(),
    });
    await render(<LoyaltyAdjustScreen />);
    expect(screen.getByLabelText(/Cuánto sumar/).props.value).toBe('50');
    await fireEvent.changeText(screen.getByLabelText(/Cuánto sumar/), '75');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({ id: 'm9', input: expect.objectContaining({ quantity: '75.00', note: 'antes' }) }),
    );
  });

  it('un canje sólo permite corregir fecha y nota', async () => {
    mockParams = { wallet: 'w1', program: 'p-pts', movement: 'm2' };
    mockMovements.mockReturnValue({
      data: [{ id: 'm2', wallet: 'w1', program: 'p-pts', program_name: 'Puntos', kind: 'redeem', delta: '-100.00', cash_value: '0.50', date: '2026-09-01', note: '', deposit_transaction: null, created_at: '' }],
      isLoading: false, refetch: jest.fn(),
    });
    await render(<LoyaltyAdjustScreen />);
    expect(screen.getByText(/La cantidad de un canje no se cambia/)).toBeTruthy();
    expect(screen.queryByLabelText(/Cuánto sumar/)).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), 'Vuelo a MIA');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({ id: 'm2', input: { date: '2026-09-01', note: 'Vuelo a MIA' } }),
    );
  });
});
