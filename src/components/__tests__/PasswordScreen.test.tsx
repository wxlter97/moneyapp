import { fireEvent, render, screen } from '@testing-library/react-native';

import PasswordScreen from '@/app/(app)/password';
import { useAuthStore } from '@/store/auth';

// `ModalHeader`/`Screen` (usados por esta pantalla) importan `expo-router`
// para el gesto de "volver" -- mismo motivo que en TwoFactorScreen.test.tsx.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

const mockChangePassword = jest.fn();
const mockSetPassword = jest.fn();
jest.mock('@/api/auth', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
  setPassword: (...args: unknown[]) => mockSetPassword(...args),
}));

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

describe('PasswordScreen', () => {
  beforeEach(() => {
    mockChangePassword.mockReset().mockResolvedValue(undefined);
    mockSetPassword.mockReset().mockResolvedValue(undefined);
  });

  it('con contraseña ya existente, pide la actual y llama a changePassword', async () => {
    useAuthStore.setState({ user: { ...BASE_USER, has_password: true } });
    await render(<PasswordScreen />);

    expect(screen.getByText('Contraseña actual')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Contraseña actual'), 'vieja-pw-1');
    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña'), 'nueva-pw-99');
    await fireEvent.changeText(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva-pw-99');
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(mockChangePassword).toHaveBeenCalledWith('vieja-pw-1', 'nueva-pw-99');
    expect(mockSetPassword).not.toHaveBeenCalled();
  });

  it('cuenta de solo Google (sin contraseña), no pide la actual y llama a setPassword', async () => {
    useAuthStore.setState({ user: { ...BASE_USER, has_password: false } });
    await render(<PasswordScreen />);

    expect(screen.queryByText('Contraseña actual')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña'), 'nueva-pw-99');
    await fireEvent.changeText(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva-pw-99');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar contraseña' }));

    expect(mockSetPassword).toHaveBeenCalledWith('nueva-pw-99');
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('avisa si la confirmación no coincide, sin llamar a la API', async () => {
    useAuthStore.setState({ user: { ...BASE_USER, has_password: false } });
    await render(<PasswordScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña'), 'nueva-pw-99');
    await fireEvent.changeText(screen.getByLabelText('Confirmar nueva contraseña'), 'distinta');

    expect(await screen.findByText('No coincide con la nueva contraseña.')).toBeTruthy();
    expect(mockSetPassword).not.toHaveBeenCalled();
  });
});
