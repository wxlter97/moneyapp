import { render, screen } from '@testing-library/react-native';

import NotFoundScreen from '@/app/+not-found';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
}));

describe('NotFoundScreen', () => {
  it('muestra el aviso y el link de vuelta al inicio', async () => {
    await render(<NotFoundScreen />);
    expect(screen.getByText('Esta pantalla no existe')).toBeTruthy();
    expect(screen.getByText('Volver al inicio')).toBeTruthy();
  });
});
