import { render, screen } from '@testing-library/react-native';

import IndexRoute from '@/app/index';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
  router: { push: jest.fn() },
}));

let mockStatus: 'loading' | 'authenticated' | 'anonymous' = 'loading';

jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: { status: string }) => unknown) => selector({ status: mockStatus }),
}));

describe('Index route (/)', () => {
  it('mientras carga la sesión no muestra ni la landing ni un redirect', async () => {
    mockStatus = 'loading';
    await render(<IndexRoute />);
    expect(screen.queryByText('Crear cuenta gratis')).toBeNull();
    expect(screen.queryByText(/^redirect:/)).toBeNull();
  });

  it('autenticado redirige a /dashboard', async () => {
    mockStatus = 'authenticated';
    await render(<IndexRoute />);
    expect(screen.getByText('redirect:/dashboard')).toBeTruthy();
  });

  it('sin sesión muestra la landing, no un redirect a /login', async () => {
    mockStatus = 'anonymous';
    await render(<IndexRoute />);
    expect(screen.getByText('Presupuesto que te va a ayudar a ahorrar de verdad')).toBeTruthy();
    expect(screen.queryByText(/^redirect:/)).toBeNull();
  });
});
