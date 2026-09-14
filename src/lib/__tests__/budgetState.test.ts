import { budgetState } from '../budgetState';

// Misma lógica que probaba antes `BudgetProgressRow.test.tsx` (auditoría de
// producto §3.2 / P0-3), ahora extraída a una única fuente compartida con
// `BudgetMeter` -- ver `lib/budgetState.ts`.
describe('budgetState', () => {
  it('bien encaminado (50%) es "ok"', () => {
    expect(budgetState(5, 10)).toEqual({ state: 'ok', ratio: 0.5, noBudget: false });
  });

  it('al 100% exacto es "over", no "ok" (empate cuenta como sobregiro)', () => {
    const s = budgetState(6, 6);
    expect(s.state).toBe('over');
    expect(s.noBudget).toBe(false);
  });

  it('gastado sin presupuesto asignado es "over" con noBudget=true', () => {
    const s = budgetState(120.38, 0);
    expect(s.state).toBe('over');
    expect(s.noBudget).toBe(true);
  });

  it('al 85% es "warning" (≥80%, sin llegar al límite)', () => {
    const s = budgetState(85, 100);
    expect(s.state).toBe('warning');
    expect(s.noBudget).toBe(false);
  });

  it('sin gasto ni presupuesto es "ok" (nada que avisar)', () => {
    expect(budgetState(0, 0)).toEqual({ state: 'ok', ratio: 0, noBudget: false });
  });
});
