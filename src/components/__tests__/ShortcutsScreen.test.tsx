import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ShortcutsScreen from '@/screens/ShortcutsScreen';
import type { PersonalAccessToken, Wallet } from '@/api/types';

// `ModalHeader`/`Screen` importan `expo-router` para el gesto de "volver" --
// mismo motivo que en TwoFactorScreen.test.tsx.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

const mockSetString = jest.fn();
jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetString(...args),
}));

// El link del Atajo sale de la config; se mockea para probar los dos casos
// (configurado / sin configurar) sin depender del entorno. El objeto se
// define dentro del factory (que jest hoistea arriba de los imports) y se
// muta por test vía `requireMock`: `shortcuts.tsx` lee `apiUrl` al importarse,
// así que para entonces ya tiene que existir.
jest.mock('@/config', () => ({
  config: { apiUrl: 'https://api.example.com/api/v1', shortcutUrl: undefined },
}));

const mockedConfig = (jest.requireMock('@/config') as { config: { shortcutUrl?: string } }).config;

const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockTokensQuery = jest.fn();

const mockWallets = [{ id: 'w-1', name: 'Crédito', purpose: 'spending' }] as unknown as Wallet[];

jest.mock('@/api/queries', () => ({
  usePersonalTokens: () => mockTokensQuery(),
  useWallets: () => ({ data: mockWallets, isLoading: false }),
  useCreatePersonalToken: () => ({ mutateAsync: mockCreate, isPending: false }),
  useDeletePersonalToken: () => ({ mutateAsync: mockDelete, isPending: false }),
  // Plan con la feature -- este archivo prueba el contenido de la
  // pantalla, no el gate en sí (eso lo cubre ProFeatureGate.test.tsx).
  useHasFeature: () => true,
}));

const TOKEN: PersonalAccessToken = {
  id: 'tok-1',
  name: 'iPhone',
  prefix: 'bt_live_abc',
  wallet: 'w-1',
  wallet_name: 'Crédito',
  // Sólo viene en claro en la respuesta de creación; en el listado es null.
  token: null,
  last_used_at: null,
  created_at: '2026-01-01T00:00:00Z',
};

function tokensQuery(tokens: PersonalAccessToken[] = []) {
  return { data: tokens, isLoading: false, isError: false, error: null, isFetching: false, refetch: jest.fn() };
}

describe('ShortcutsScreen', () => {
  beforeEach(() => {
    mockedConfig.shortcutUrl = undefined;
    mockSetString.mockReset().mockResolvedValue(undefined);
    mockCreate.mockReset();
    mockDelete.mockReset().mockResolvedValue(undefined);
    mockTokensQuery.mockReset().mockReturnValue(tokensQuery([TOKEN]));
    jest.spyOn(Linking, 'openURL').mockReset().mockResolvedValue(true as never);
  });

  it('sin link configurado, no ofrece instalar: sólo las instrucciones manuales', async () => {
    await render(<ShortcutsScreen />);

    expect(screen.queryByRole('button', { name: 'Instalar atajo' })).toBeNull();
    expect(screen.getByText('Cómo armarlo en Shortcuts')).toBeTruthy();
  });

  it('con link configurado, ofrece instalarlo y deja las instrucciones como alternativa', async () => {
    mockedConfig.shortcutUrl = 'https://www.icloud.com/shortcuts/abc123';
    await render(<ShortcutsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Instalar atajo' }));

    expect(Linking.openURL).toHaveBeenCalledWith('https://www.icloud.com/shortcuts/abc123');
    expect(screen.getByText('O armalo a mano')).toBeTruthy();
  });

  it('recién generado un token, instalar queda bloqueado hasta copiarlo', async () => {
    mockedConfig.shortcutUrl = 'https://www.icloud.com/shortcuts/abc123';
    mockCreate.mockResolvedValue({ ...TOKEN, token: 'bt_live_secretovalor' });
    await render(<ShortcutsScreen />);

    // Generar un token revela la card con el valor en claro.
    await fireEvent.changeText(screen.getByPlaceholderText('p. ej. iPhone de Juan'), 'iPhone');
    await fireEvent.press(screen.getByText('Elegir'));
    await fireEvent.press(screen.getByText('Crédito'));
    await fireEvent.press(screen.getByRole('button', { name: 'Generar token' }));

    const revealed = await screen.findByText('bt_live_secretovalor');
    expect(revealed).toBeTruthy();

    // Dos botones "Instalar atajo": el de la card del token (bloqueado) y el
    // de la card general. Copiar el token desbloquea el primero.
    const installButtons = screen.getAllByRole('button', { name: 'Instalar atajo' });
    expect(installButtons.some((b) => b.props.accessibilityState?.disabled)).toBe(true);

    await fireEvent.press(screen.getByLabelText('Copiar token'));
    expect(mockSetString).toHaveBeenCalledWith('bt_live_secretovalor');

    await waitFor(() => {
      const after = screen.getAllByRole('button', { name: 'Instalar atajo' });
      expect(after.every((b) => !b.props.accessibilityState?.disabled)).toBe(true);
    });
  });
});
