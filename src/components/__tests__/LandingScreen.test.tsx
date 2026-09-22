import { fireEvent, render, screen } from '@testing-library/react-native';

import { LandingScreen } from '@/screens/LandingScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

describe('LandingScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('muestra el mensaje principal y los dos accesos', async () => {
    await render(<LandingScreen />);
    expect(screen.getByText('Presupuesto que te va a ayudar a ahorrar de verdad')).toBeTruthy();
    expect(screen.getByText('Crear cuenta gratis')).toBeTruthy();
    expect(screen.getByText('Ya tengo cuenta')).toBeTruthy();
  });

  it('crear cuenta lleva a /register', async () => {
    await render(<LandingScreen />);
    await fireEvent.press(screen.getByText('Crear cuenta gratis'));
    expect(mockPush).toHaveBeenCalledWith('/register');
  });

  it('ya tengo cuenta lleva a /login', async () => {
    await render(<LandingScreen />);
    await fireEvent.press(screen.getByText('Ya tengo cuenta'));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
