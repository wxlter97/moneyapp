import { isPlanUpgradeError } from '@/lib/planErrors';

describe('isPlanUpgradeError', () => {
  it('detecta los mensajes de límite/feature del backend (siempre mencionan "Pro")', () => {
    expect(isPlanUpgradeError('Llegaste al límite de presupuestos de tu plan -- pasate a Pro para crear más.')).toBe(true);
    expect(isPlanUpgradeError('El respaldo y restauración son funciones Pro -- pasate a Pro para usarlas.')).toBe(true);
  });

  it('no confunde un error cualquiera con uno de plan', () => {
    expect(isPlanUpgradeError('No se pudo conectar con el servidor.')).toBe(false);
  });

  it('null/undefined no revientan', () => {
    expect(isPlanUpgradeError(null)).toBe(false);
    expect(isPlanUpgradeError(undefined)).toBe(false);
  });
});
