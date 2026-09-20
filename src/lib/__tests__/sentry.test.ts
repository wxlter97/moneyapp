import { captureException, initSentry } from '../sentry';

const mockInit = jest.fn();
const mockCapture = jest.fn();
jest.mock('@sentry/react-native', () => ({
  init: (...a: unknown[]) => mockInit(...a),
  captureException: (...a: unknown[]) => mockCapture(...a),
}));

// El DSN se lee de `process.env.EXPO_PUBLIC_*`, que Expo sustituye al compilar, así
// que un test no puede cambiarlo en caliento: acá se cubre el caso sin DSN, que es
// el que tiene que seguir sin tocar el SDK. La carga diferida con DSN se comprueba
// mirando el build (el SDK sale del bundle principal a su propio archivo).
describe('sentry sin DSN', () => {
  it('no inicializa ni reporta nada, ni carga el SDK', async () => {
    initSentry();
    captureException(new Error('x'));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
