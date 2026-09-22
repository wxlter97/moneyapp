/**
 * Heurística para distinguir un error de "hace falta un plan mejor" (límite
 * de plan o función gateada) de cualquier otro 400/403 -- todos los
 * mensajes de gating del backend incluyen "Pro" o "Plus" (ver
 * `apps.billing.services.require_feature_for_workspace`/`FEATURE_UPGRADE_MESSAGES`
 * y los mensajes de límite en `apps.workspaces.api`/`RecurringExpenseSerializer`).
 * Sin esto, las funciones que pasaron a requerir Plus (22-sep-2026, ver
 * `ECONOMIA-POR-PLAN.md`) quedarían sin reconocerse -- "Plus" no contiene
 * "Pro" como substring.
 */
export function isPlanUpgradeError(message: string | null | undefined): boolean {
  if (!message) return false;
  return message.includes('Pro') || message.includes('Plus');
}
