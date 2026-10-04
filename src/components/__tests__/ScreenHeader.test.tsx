import { fireEvent, render, screen } from '@testing-library/react-native';

import { ScreenHeader } from '@/components/ScreenHeader';

const mockSignOut = jest.fn();

jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ signOut: mockSignOut }),
}));
jest.mock('@/components/WorkspaceSwitcher', () => ({ WorkspaceSwitcher: () => null }));
jest.mock('@/components/NotificationBell', () => ({ NotificationBell: () => null }));

// El ícono de salir sacaba la sesión de un toque, sin preguntar.
describe('ScreenHeader', () => {
  beforeEach(() => mockSignOut.mockClear());

  it('pide confirmación antes de cerrar sesión', async () => {
    await render(<ScreenHeader />);
    await fireEvent.press(screen.getByLabelText('Cerrar sesión'));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.getByText('¿Cerrar sesión?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Cancelar'));
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('cierra sesión al confirmar', async () => {
    await render(<ScreenHeader />);
    await fireEvent.press(screen.getByLabelText('Cerrar sesión'));
    await fireEvent.press(screen.getByText('Cerrar sesión'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
