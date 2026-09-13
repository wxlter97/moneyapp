import { fireEvent, render, screen } from '@testing-library/react-native';

import DeleteAccountScreen from '@/app/(app)/delete-account';
import { useAuthStore } from '@/store/auth';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
}));

const mockDeleteAccount = jest.fn();
jest.mock('@/api/auth', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
  logout: jest.fn().mockResolvedValue(undefined),
}));

const { router } = jest.requireMock('expo-router');

const BASE_USER = {
  id: 1,
  username: 'yo',
  email: 'yo@example.com',
  first_name: '',
  last_name: '',
  profile_photo_url: '',
  google_linked: false,
  two_factor_enabled: false,
  onboarding_completed: true,
  date_joined: '2026-01-01T00:00:00Z',
};

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset().mockResolvedValue(undefined);
    router.replace.mockClear();
    useAuthStore.setState({ status: 'authenticated' });
  });

  it('sin escribir BORRAR, apretar el botón no llama al backend', async () => {
    useAuthStore.setState({ user: { ...BASE_USER, has_password: true } });
    await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar mi cuenta' }));
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('cuenta con contraseña: manda password, no confirm', async () => {
    useAuthStore.setState({ user: { ...BASE_USER, has_password: true } });
    await render(<DeleteAccountScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('BORRAR'), 'BORRAR');
    await fireEvent.changeText(screen.getByLabelText('Tu contraseña'), 'mi-clave');
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar mi cuenta' }));

    expect(mockDeleteAccount).toHaveBeenCalledWith({ password: 'mi-clave' });
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('cuenta de solo Google: no pide contraseña, manda confirm: true', async () => {
    useAuthStore.setState({ user: { ...BASE_USER, has_password: false } });
    await render(<DeleteAccountScreen />);
    expect(screen.queryByLabelText('Tu contraseña')).toBeNull();

    await fireEvent.changeText(screen.getByPlaceholderText('BORRAR'), 'BORRAR');
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar mi cuenta' }));

    expect(mockDeleteAccount).toHaveBeenCalledWith({ confirm: true });
  });

  it('si el backend rechaza (p. ej. workspace compartido), muestra el error y no cierra sesión', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('No se pudo borrar la cuenta.'));
    useAuthStore.setState({ user: { ...BASE_USER, has_password: true } });
    await render(<DeleteAccountScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('BORRAR'), 'BORRAR');
    await fireEvent.changeText(screen.getByLabelText('Tu contraseña'), 'mi-clave');
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar mi cuenta' }));

    expect(await screen.findByText('No se pudo borrar la cuenta.')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
