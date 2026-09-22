import { isPlanUpgradeError } from '@/lib/planErrors';

describe('isPlanUpgradeError', () => {
  it('detecta los mensajes de límite/feature del backend (siempre mencionan "Pro")', () => {
    expect(isPlanUpgradeError('Llegaste al límite de presupuestos de tu plan -- pasate a Pro para crear más.')).toBe(true);
    expect(isPlanUpgradeError('El respaldo y restauración son funciones Pro -- pasate a Pro para usarlas.')).toBe(true);
  });

  it('también detecta los mensajes de las funciones que pasaron a requerir Plus (22-sep-2026)', () => {
    expect(isPlanUpgradeError('Los gastos recurrentes son parte de Plus -- pasate a Plus para activarlos.')).toBe(true);
    expect(isPlanUpgradeError('Dividir una cartera en varias es parte de Plus -- pasate a Plus para hacerlo.')).toBe(true);
  });

  it('no confunde un error cualquiera con uno de plan', () => {
    expect(isPlanUpgradeError('No se pudo conectar con el servidor.')).toBe(false);
  });

  it('null/undefined no revientan', () => {
    expect(isPlanUpgradeError(null)).toBe(false);
    expect(isPlanUpgradeError(undefined)).toBe(false);
  });
});
