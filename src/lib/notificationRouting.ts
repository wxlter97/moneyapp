/**
 * Qué se puede hacer con una notificación -- un push tapeado (app en
 * segundo plano o cerrada, ver `addNotificationTapListener`) o una fila del
 * centro de notificaciones (`(app)/notification-center.tsx`). Un solo lugar
 * para esta decisión.
 *
 * `data` es el mismo payload que arma el backend en cada `Notification.data`
 * / el `data` de un push (ver `apps.notifications.services` y
 * `apps.notifications.models.Notification` del backend) -- siempre trae
 * `type` con el `kind` de la notificación, y además el id del objeto al que
 * se refiere (`wallet`, `category`, `source_id`, `log_id`...). Con eso cada
 * aviso lleva directo a SU cosa (esta tarjeta, esta categoría, este correo)
 * en vez de a una pantalla genérica, y puede ofrecer la acción que resuelve
 * el aviso (registrar el recurrente, pagar la tarjeta...).
 */
import type { Href } from 'expo-router';

/** Una acción de una notificación. `route` navega; las otras necesitan datos
 * del servidor o de la sesión (la regla recurrente, la cartera por defecto)
 * y las resuelve quien las muestra -- ver `notification-center.tsx`. */
export type NotificationAction =
  | { kind: 'route'; label: string; href: Href }
  /** Abre "Agregar transacción" precargada con la regla recurrente
   * `recurringId` (mismo flujo que tocar un ítem "Programado"). */
  | { kind: 'record-recurring'; label: string; recurringId: string }
  /** Abre una transferencia hacia `walletId` (pagar la tarjeta, reponer una
   * cartera con saldo bajo), con `amount` ya puesto si el aviso lo trae. */
  | { kind: 'transfer-to'; label: string; walletId: string; amount?: string; note?: string };

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function withQuery(path: string, params: Record<string, string>): Href {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return (qs ? `${path}?${qs}` : path) as Href;
}

/** Acciones de una notificación, la principal primero. Nunca vacía: sin
 * nada específico, al menos "Ir al resumen". */
export function actionsForNotification(data: Record<string, unknown>): NotificationAction[] {
  const actions: NotificationAction[] = [];
  const wallet = str(data.wallet);

  switch (data.type) {
    case 'recurring_due': {
      const id = str(data.source_id);
      if (id) {
        actions.push({ kind: 'record-recurring', label: 'Registrar ahora', recurringId: id });
        actions.push({ kind: 'route', label: 'Ver recurrente', href: `/recurring/${id}` as Href });
      } else {
        actions.push({ kind: 'route', label: 'Ver recurrentes', href: '/recurring' });
      }
      break;
    }
    case 'installment_due': {
      const id = str(data.source_id);
      actions.push(
        id
          ? { kind: 'route', label: 'Ver compra a plazo', href: `/installment/${id}` as Href }
          : { kind: 'route', label: 'Ver compras a plazo', href: '/installments' },
      );
      break;
    }
    case 'budget_threshold': {
      const category = str(data.category);
      if (category) {
        actions.push({
          kind: 'route',
          label: 'Ver movimientos',
          href: withQuery('/category-transactions', { category }),
        });
      }
      actions.push({ kind: 'route', label: 'Ver presupuesto', href: '/budgets' });
      actions.push({ kind: 'route', label: 'Ajustar', href: '/budget-edit' });
      break;
    }
    case 'low_balance':
      if (wallet) {
        actions.push({ kind: 'transfer-to', label: 'Transferir a esta cartera', walletId: wallet });
        actions.push({
          kind: 'route',
          label: 'Ver movimientos',
          href: withQuery('/wallet-transactions', { wallet }),
        });
      }
      break;
    case 'statement_due':
      if (wallet) {
        actions.push({
          kind: 'transfer-to',
          label: 'Registrar pago',
          walletId: wallet,
          amount: str(data.amount) ?? undefined,
          note: 'Pago de tarjeta',
        });
        actions.push({ kind: 'route', label: 'Ver estado de cuenta', href: `/statement/${wallet}` as Href });
      }
      break;
    case 'invitation':
      actions.push({ kind: 'route', label: 'Ver invitación', href: '/invitations' });
      break;
    case 'email_import_pending': {
      const logId = str(data.log_id);
      actions.push(
        logId
          ? { kind: 'route', label: 'Revisar movimiento', href: `/import/${logId}` as Href }
          : { kind: 'route', label: 'Ver correos', href: '/imports' },
      );
      break;
    }
    case 'subscription_renewal_due':
    case 'subscription_expired':
      actions.push({ kind: 'route', label: 'Ver mi plan', href: '/pro' });
      break;
    case 'insight':
    case 'monthly_summary':
      // Sin pantalla propia todavía (ver `apps.reports.services.
      // behavior_insights` en el backend) -- el dashboard ya muestra el
      // resumen de gasto que le da contexto al patrón detectado.
      actions.push({ kind: 'route', label: 'Ver resumen', href: '/dashboard' });
      break;
  }

  if (actions.length === 0) actions.push({ kind: 'route', label: 'Ir al resumen', href: '/dashboard' });
  return actions;
}

/** A dónde navegar al tocar un push: la primera acción que sea sólo
 * navegar -- abrir un formulario precargado desde un push, sin haber visto
 * el aviso completo, sería sorprendente. */
export function routeForNotification(data: Record<string, unknown>): Href {
  const route = actionsForNotification(data).find((a) => a.kind === 'route');
  return route && route.kind === 'route' ? route.href : '/dashboard';
}
