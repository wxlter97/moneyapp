import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';

const mockCaptureException = jest.fn();
jest.mock('@/lib/sentry', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

function Bomb(): React.ReactElement {
  throw new Error('boom');
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    mockCaptureException.mockReset();
    // React loguea el error de todos modos por consola en dev -- no es lo
    // que este test verifica, sólo evita ensuciar la salida.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('sin error, renderiza los hijos normalmente', async () => {
    await render(
      <AppErrorBoundary>
        <Text>Todo bien</Text>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Todo bien')).toBeTruthy();
  });

  it('si un hijo tira, muestra el fallback y reporta a Sentry', async () => {
    await render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Algo salió mal')).toBeTruthy();
    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it('"Reintentar" vuelve a intentar renderizar los hijos', async () => {
    let shouldThrow = true;
    function MaybeBomb() {
      if (shouldThrow) throw new Error('boom');
      return <Text>Recuperado</Text>;
    }

    await render(
      <AppErrorBoundary>
        <MaybeBomb />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Algo salió mal')).toBeTruthy();

    shouldThrow = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByText('Recuperado')).toBeTruthy();
  });
});
