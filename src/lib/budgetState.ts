import type { ProgressState } from '@/components/ui/ProgressBar';

/** A partir de qué fracción del presupuesto se avisa "cerca del límite". */
export const BUDGET_WARNING_THRESHOLD = 0.8;

export interface BudgetState {
  state: ProgressState;
  /** 0..1 (o más, si se pasó -- quien lo use decide si lo recorta). */
  ratio: number;
  /** Gastó algo sin tener nada presupuestado (ej. "Miscelánea"). */
  noBudget: boolean;
}

/**
 * Estado semántico de un renglón de presupuesto (categoría, grupo, total del
 * período…) a partir de lo gastado y lo presupuestado. Única fuente de esta
 * lógica -- la consumen `BudgetProgressRow` y `BudgetMeter`, así que un
 * cambio en la regla de sobregiro no puede quedar aplicado en una sola de
 * las dos vistas.
 *
 * Regresión de la auditoría de producto (§3.2 / P0-3): gastar sin tener nada
 * presupuestado es tan sobregiro como pasarse de un presupuesto que sí
 * existe, y llegar exacto al 100% ya es "sin margen", no "todo bien" --
 * `over` usa `>=`, no `>`, y no exige `budgeted > 0`.
 */
export function budgetState(spent: number, budgeted: number): BudgetState {
  const noBudget = budgeted <= 0 && spent > 0;
  const over = noBudget || (budgeted > 0 && spent >= budgeted);
  const ratio = budgeted > 0 ? spent / budgeted : spent > 0 ? 1 : 0;
  const warning = !over && ratio >= BUDGET_WARNING_THRESHOLD;
  return { state: over ? 'over' : warning ? 'warning' : 'ok', ratio, noBudget };
}
