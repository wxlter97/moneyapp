import { act, fireEvent, render, screen } from '@testing-library/react-native';

import PlacedOrderScreen from '@/app/(app)/placed-order';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: (...a: unknown[]) => mockReplace(...a), canGoBack: () => false },
  // Cualquiera puede abrir /placed-order?... a mano: la pantalla no debe leer estos parámetros.
  useLocalSearchParams: () => ({ idTransaccion: 'x', monto: '999', esReal: 'true' }),
}));

const mockRefetch = jest.fn();
let mockPlan: { plan: { name: string; is_default: boolean } | null } | undefined;
jest.mock('@/api/queries', () => ({
  useMyPlan: () => ({ data: mockPlan, refetch: mockRefetch }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockPlan = { plan: { name: 'Gratis', is_default: true } };
});
afterEach(() => jest.useRealTimers());

describe('/placed-order', () => {
  it('mientras el plan sigue siendo el gratis, dice que confirma el pago', async () => {
    await render(<PlacedOrderScreen />);
    expect(screen.getByText('Confirmando tu pago…')).toBeTruthy();
  });

  it('pregunta por el plan cada pocos segundos hasta que cambia', async () => {
    await render(<PlacedOrderScreen />);
    await act(async () => { jest.advanceTimersByTime(9_000); });
    expect(mockRefetch).toHaveBeenCalledTimes(3);
  });

  it('cuando el plan pasa a uno pago muestra el éxito y deja de preguntar', async () => {
    const { rerender } = await render(<PlacedOrderScreen />);
    mockPlan = { plan: { name: 'Pro', is_default: false } };
    await rerender(<PlacedOrderScreen />);
    expect(screen.getByText('¡Listo! Ya tienes Pro')).toBeTruthy();
    mockRefetch.mockClear();
    await act(async () => { jest.advanceTimersByTime(20_000); });
    expect(mockRefetch).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Continuar'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('si el plan no cambia tras 90 s, explica que puede tardar y no pide pagar otra vez', async () => {
    await render(<PlacedOrderScreen />);
    await act(async () => { jest.advanceTimersByTime(91_000); });
    expect(screen.getByText('Todavía no vemos la confirmación')).toBeTruthy();
    expect(screen.getByText(/no hace falta pagar otra vez/)).toBeTruthy();
    fireEvent.press(screen.getByText('Ver mi plan'));
    expect(mockReplace).toHaveBeenCalledWith('/pro');
  });

  it('no da por pagado nada que venga en la URL', async () => {
    // Los parámetros de arriba dicen «esReal=true, monto=999», y aun así sigue esperando.
    await render(<PlacedOrderScreen />);
    expect(screen.queryByText(/Listo/)).toBeNull();
  });
});
