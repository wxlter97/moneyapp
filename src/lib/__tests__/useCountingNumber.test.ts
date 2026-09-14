import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useCountingNumber } from '../useCountingNumber';

/** `requestAnimationFrame` real no sirve en un test (no hay reloj real que
 * avanzar) -- se reemplaza por una cola manual: cada llamada a `flushFrame`
 * dispara el callback más viejo pendiente con el timestamp que se le pasa,
 * simulando el paso del tiempo sin esperas reales. */
function mockRaf() {
  let queue: { id: number; cb: FrameRequestCallback }[] = [];
  let nextId = 1;
  const raf = jest.fn((cb: FrameRequestCallback) => {
    const id = nextId++;
    queue.push({ id, cb });
    return id;
  });
  const caf = jest.fn((id: number) => {
    queue = queue.filter((f) => f.id !== id);
  });
  function flushFrame(ts: number) {
    const frame = queue.shift();
    frame?.cb(ts);
  }
  return { raf, caf, flushFrame };
}

describe('useCountingNumber', () => {
  let raf: ReturnType<typeof mockRaf>['raf'];
  let caf: ReturnType<typeof mockRaf>['caf'];
  let flushFrame: ReturnType<typeof mockRaf>['flushFrame'];

  beforeEach(() => {
    ({ raf, caf, flushFrame } = mockRaf());
    global.requestAnimationFrame = raf as unknown as typeof requestAnimationFrame;
    global.cancelAnimationFrame = caf as unknown as typeof cancelAnimationFrame;
  });

  it('sin movimiento reducido, cuenta gradualmente hasta el valor final', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result, rerender } = await renderHook<number, { target: number }>(
      ({ target }) => useCountingNumber(target, 400),
      { initialProps: { target: 0 } },
    );
    expect(result.current).toBe(0);

    await act(async () => {
      rerender({ target: 100 });
    });
    // Deja que se resuelva el `.then()` de `isReduceMotionEnabled` antes de
    // avanzar frames -- si no, la primera animación puede arrancar antes de
    // que `reducedRef` esté seteado (mismo comportamiento real, es async).
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      flushFrame(0); // primer frame: fija el t0, todavía en 0
    });
    expect(result.current).toBe(0);

    await act(async () => {
      flushFrame(200); // a mitad de camino (200/400) -- ease-out, no lineal: > 50
    });
    expect(result.current).toBeGreaterThan(50);
    expect(result.current).toBeLessThan(100);

    await act(async () => {
      flushFrame(400); // completa la duración
    });
    expect(result.current).toBe(100);
  });

  it('con movimiento reducido, salta directo al valor final sin animar', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { result, rerender } = await renderHook<number, { target: number }>(
      ({ target }) => useCountingNumber(target, 400),
      { initialProps: { target: 0 } },
    );
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      rerender({ target: 250 });
    });
    expect(result.current).toBe(250);
    expect(raf).not.toHaveBeenCalled();
  });

  it('con enabled=false (Money sin animate), sigue el valor real sin animar', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result, rerender } = await renderHook<number, { target: number }>(
      ({ target }) => useCountingNumber(target, 400, false),
      { initialProps: { target: 0 } },
    );

    await act(async () => {
      rerender({ target: 42 });
    });
    expect(result.current).toBe(42);
    expect(raf).not.toHaveBeenCalled();
  });
});
