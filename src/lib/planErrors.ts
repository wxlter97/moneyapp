/**
 * Heurística para distinguir un error de "hace falta Pro" (límite de plan o
 * función gateada) de cualquier otro 400/403 -- todos los mensajes de
 * gating del backend incluyen la palabra "Pro" (ver
 * `apps.billing.services.require_feature_for_workspace` y los mensajes de
 * límite en `apps.workspaces.api`).
 */
export function isPlanUpgradeError(message: string | null | undefined): boolean {
  return message?.includes('Pro') ?? false;
}
