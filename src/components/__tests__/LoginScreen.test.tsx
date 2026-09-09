import { fireEvent, render, screen } from '@testing-library/react-native';

import LoginScreen from '@/app/login';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
}));

// Requiere un client ID de Google configurado (`expo-auth-session`
// revienta si no lo encuentra) -- no hace falta un login de Google real
// para probar el paso de 2FA, así que se lo reemplaza por un stub.
jest.mock('@/components/GoogleSignInButton', () => ({
  GoogleSignInButton: () => null,
}));

const mockSignIn = jest.fn();
const mockVerifyTwoFactor = jest.fn();
const mockCancelTwoFactor = jest.fn();

// Estado mutable del store simulado -- cada test lo pisa antes de renderizar.
let mockAuthState: {
  status: 'authenticated' | 'unauthenticated';
  pendingMfaToken: string | null;
};

jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      ...mockAuthState,
      signIn: (...args: unknown[]) => mockSignIn(...args),
      verifyTwoFactor: (...args: unknown[]) => mockVerifyTwoFactor(...args),
      cancelTwoFactor: (...args: unknown[]) => mockCancelTwoFactor(...args),
    }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockVerifyTwoFactor.mockReset();
    mockCancelTwoFactor.mockReset();
    mockAuthState = { status: 'unauthenticated', pendingMfaToken: null };
  });

  it('sin pendingMfaToken, muestra el formulario normal (usuario/contraseña)', async () => {
    await render(<LoginScreen />);
    expect(screen.getByText('Entrar')).toBeTruthy();
    expect(screen.queryByText('Verificación en dos pasos')).toBeNull();
  });

  it('con pendingMfaToken, muestra el segundo paso (código) en vez del formulario', async () => {
    mockAuthState = { status: 'unauthenticated', pendingMfaToken: 'mfa-token-123' };
    await render(<LoginScreen />);
    expect(screen.getByText('Verificación en dos pasos')).toBeTruthy();
    expect(screen.getByText('Verificar')).toBeTruthy();
    expect(screen.queryByText('Entrar')).toBeNull();
  });

  it('"Verificar" llama a verifyTwoFactor con el código escrito', async () => {
    mockAuthState = { status: 'unauthenticated', pendingMfaToken: 'mfa-token-123' };
    mockVerifyTwoFactor.mockResolvedValue(undefined);
    await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('Código'), 'ABC123');
    await fireEvent.press(screen.getByText('Verificar'));

    expect(mockVerifyTwoFactor).toHaveBeenCalledWith('ABC123');
  });

  it('un código inválido muestra el error sin perder el paso', async () => {
    mockAuthState = { status: 'unauthenticated', pendingMfaToken: 'mfa-token-123' };
    mockVerifyTwoFactor.mockRejectedValue(new Error('Código inválido.'));
    await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('Código'), '000000');
    await fireEvent.press(screen.getByText('Verificar'));

    expect(await screen.findByText('Código inválido.')).toBeTruthy();
    expect(screen.getByText('Verificación en dos pasos')).toBeTruthy();
  });

  it('"Volver" cancela el segundo paso', async () => {
    mockAuthState = { status: 'unauthenticated', pendingMfaToken: 'mfa-token-123' };
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('Volver'));
    expect(mockCancelTwoFactor).toHaveBeenCalled();
  });
});
