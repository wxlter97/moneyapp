import { usePushPrefStore } from '../pushPref';

describe('usePushPrefStore', () => {
  it('por defecto los avisos están encendidos (el registro automático sigue como hasta ahora)', () => {
    expect(usePushPrefStore.getState().enabled).toBe(true);
  });

  it('apagar y volver a encender se recuerda', () => {
    usePushPrefStore.getState().setEnabled(false);
    expect(usePushPrefStore.getState().enabled).toBe(false);
    usePushPrefStore.getState().setEnabled(true);
    expect(usePushPrefStore.getState().enabled).toBe(true);
  });
});
