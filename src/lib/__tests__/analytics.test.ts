import { track } from '@/lib/analytics';

describe('track', () => {
  afterEach(() => {
    delete (window as { umami?: unknown }).umami;
  });

  it('no hace nada si el script de Umami no cargó', () => {
    expect(() => track('algo')).not.toThrow();
  });

  it('llama a window.umami.track con el evento y los datos', () => {
    const mockTrack = jest.fn();
    window.umami = { track: mockTrack };

    track('transaction_created', { channel: 'voice' });

    expect(mockTrack).toHaveBeenCalledWith('transaction_created', { channel: 'voice' });
  });

  it('un tracker que revienta no rompe la acción real', () => {
    window.umami = {
      track: () => {
        throw new Error('boom');
      },
    };
    expect(() => track('algo')).not.toThrow();
  });
});
