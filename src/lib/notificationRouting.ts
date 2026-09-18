/**
 * A dónde navegar al tocar una notificación -- un push tapeado (app en
 * segundo plano o cerrada, ver `addNotificationTapListener`) o una fila del
 * centro de notificaciones (`(app)/notification-center.tsx`). Un solo lugar
 * para esta decisión: antes sólo vivía (a medias, sólo para
 * `budget_threshold`) en el listener de push de `(app)/_layout.tsx`.
 *
 * `data` es el mismo payload que arma el backend en cada `Notification.data`
 * / el `data` de un push (ver `apps.notifications.services` y
 * `apps.notifications.models.Notification` del backend) -- siempre trae
 * `type` con el `kind` de la notificación.
 */
import type { Href } from 'expo-router';

export function routeForNotification(data: Record<string, unknown>): Href {
  switch (data.type) {
    case 'budget_threshold':
      return '/budgets';
    case 'invitation':
      return '/invitations';
    case 'email_import_pending':
      return '/imports';
    case 'insight':
      // Sin pantalla propia todavía (ver `apps.reports.services.
      // behavior_insights` en el backend) -- el dashboard ya muestra el
      // resumen de gasto que le da contexto al patrón detectado.
      return '/dashboard';
    default:
      return '/dashboard';
  }
}
