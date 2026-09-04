import { useSnackbarStore } from '../snackbar';

describe('useSnackbarStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSnackbarStore.setState({ visible: false, message: '', actionLabel: undefined, onAction: undefined });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('muestra el mensaje y dispara onTimeout si nadie actúa', () => {
    const onTimeout = jest.fn();
    useSnackbarStore.getState().show({ message: 'Eliminado.', actionLabel: 'Deshacer', onTimeout });

    expect(useSnackbarStore.getState().visible).toBe(true);
    expect(useSnackbarStore.getState().message).toBe('Eliminado.');
    expect(onTimeout).not.toHaveBeenCalled();

    jest.advanceTimersByTime(4000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(useSnackbarStore.getState().visible).toBe(false);
  });

  it('hide() cancela el onTimeout pendiente (deshacer real)', () => {
    const onTimeout = jest.fn();
    useSnackbarStore.getState().show({ message: 'Eliminado.', onTimeout, duration: 1000 });

    useSnackbarStore.getState().hide();
    jest.advanceTimersByTime(5000);

    expect(onTimeout).not.toHaveBeenCalled();
    expect(useSnackbarStore.getState().visible).toBe(false);
  });

  it('mostrar uno nuevo reemplaza al anterior sin correr su onTimeout', () => {
    const firstTimeout = jest.fn();
    const secondTimeout = jest.fn();
    useSnackbarStore.getState().show({ message: 'Primero', onTimeout: firstTimeout, duration: 1000 });
    useSnackbarStore.getState().show({ message: 'Segundo', onTimeout: secondTimeout, duration: 1000 });

    jest.advanceTimersByTime(1000);

    expect(firstTimeout).not.toHaveBeenCalled();
    expect(secondTimeout).toHaveBeenCalledTimes(1);
    expect(useSnackbarStore.getState().message).toBe('Segundo');
  });

  it('respeta una duración custom', () => {
    const onTimeout = jest.fn();
    useSnackbarStore.getState().show({ message: 'x', onTimeout, duration: 200 });

    jest.advanceTimersByTime(199);
    expect(onTimeout).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
