import { fireEvent, render, screen } from '@testing-library/react-native';

import OnboardingScreen from '@/app/(app)/onboarding';

// `Screen` (usado por esta pantalla) importa `expo-router` para el gesto de
// "volver" -- mismo motivo que en TwoFactorScreen.test.tsx.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockCreateWallet = jest.fn();
jest.mock('@/api/queries', () => ({
  useWallets: () => ({ data: [], isLoading: false }),
  useCreateWallet: () => ({ mutateAsync: (...args: unknown[]) => mockCreateWallet(...args) }),
}));

const mockMarkOnboardingCompleted = jest.fn();
jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ markOnboardingCompleted: (...args: unknown[]) => mockMarkOnboardingCompleted(...args) }),
}));

describe('OnboardingScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockMarkOnboardingCompleted.mockReset().mockResolvedValue(undefined);
    mockCreateWallet.mockReset().mockResolvedValue({});
  });

  it('arranca en el primer paso, sin botón de "Atrás"', async () => {
    await render(<OnboardingScreen />);
    expect(screen.getByText('Bienvenido a porksupuesto')).toBeTruthy();
    expect(screen.queryByText('Atrás')).toBeNull();
  });

  it('"Saltar" marca el tour completado y entra al dashboard', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Saltar'));
    expect(mockMarkOnboardingCompleted).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('el paso de carteras crea todas de una vez, con su saldo', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(screen.getByText('Tus cuentas, de una vez')).toBeTruthy();

    // Arranca con Efectivo y una cuenta bancaria; se agrega una tarjeta.
    await fireEvent.press(screen.getByText('Tarjeta'));
    await fireEvent.press(screen.getByText('Guardar 3 carteras'));

    expect(mockCreateWallet).toHaveBeenCalledTimes(3);
    const [cash, bank, card] = mockCreateWallet.mock.calls.map((c) => c[0]);
    expect(cash).toMatchObject({ name: 'Efectivo', kind: 'cash', purpose: 'spending', is_default: true });
    expect(bank).toMatchObject({ kind: 'bank', is_default: false });
    expect(card).toMatchObject({ kind: 'credit', purpose: 'debt' });
    expect(await screen.findByText('Listo: 3 carteras creadas.')).toBeTruthy();
  });

  it('llegar al último paso cambia el botón a "Empezar" y también marca completado', async () => {
    await render(<OnboardingScreen />);
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(screen.getByText('Siguiente'));
    }
    // 5 pasos en total (índice 0-4): el último.
    expect(screen.getByText('Listo')).toBeTruthy();

    await fireEvent.press(screen.getByText('Empezar'));
    expect(mockMarkOnboardingCompleted).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});
