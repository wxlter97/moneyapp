import { fireEvent, render, screen } from '@testing-library/react-native';

import OnboardingScreen from '@/app/(app)/onboarding';

// `Screen` (usado por esta pantalla) importa `expo-router` para el gesto de
// "volver" -- mismo motivo que en TwoFactorScreen.test.tsx.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock('@/api/queries', () => ({
  useWallets: () => ({ data: [], isLoading: false }),
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
  });

  it('arranca en el primer paso, sin botón de "Atrás"', async () => {
    await render(<OnboardingScreen />);
    expect(screen.getByText('Bienvenido a Porsupuesto')).toBeTruthy();
    expect(screen.queryByText('Atrás')).toBeNull();
  });

  it('"Saltar" marca el tour completado y entra al dashboard', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Saltar'));
    expect(mockMarkOnboardingCompleted).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('"Siguiente" avanza de paso, y el paso de cartera abre wallet/new', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Siguiente')); // -> Presupuestos
    await fireEvent.press(screen.getByText('Siguiente')); // -> Carteras
    await fireEvent.press(screen.getByText('Siguiente')); // -> Creá tu primera cartera
    expect(screen.getByText('Creá tu primera cartera')).toBeTruthy();

    await fireEvent.press(screen.getByText('Crear mi primera cartera'));
    expect(mockPush).toHaveBeenCalledWith('/wallet/new');
  });

  it('llegar al último paso cambia el botón a "Empezar" y también marca completado', async () => {
    await render(<OnboardingScreen />);
    for (let i = 0; i < 7; i++) {
      await fireEvent.press(screen.getByText('Siguiente'));
    }
    // 7 pasos después del primero (8 en total, índice 0-7): el último.
    expect(screen.getByText('Listo')).toBeTruthy();

    await fireEvent.press(screen.getByText('Empezar'));
    expect(mockMarkOnboardingCompleted).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});
