/** Web Push (RFC 8291) del lado del navegador: registra el service worker
 * de `public/push-worker.js` y la suscripción contra VAPID. Sólo tiene
 * sentido en `Platform.OS === 'web'` -- lo llama
 * `lib/notifications.ts::registerForPushNotificationsAsync`, que ya hace
 * ese chequeo antes de entrar acá. */
import { fromByteArray } from 'base64-js';

export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return fromByteArray(new Uint8Array(buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** El navegador pide la clave VAPID como bytes crudos, no como el string
 * base64url que da el backend. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Pide permiso de notificaciones, registra el service worker y suscribe al
 * navegador contra VAPID -- o `null` si algo de eso no está disponible (sin
 * soporte de push, permiso denegado, o `vapidPublicKey` vacío porque el
 * backend no lo tiene configurado). Nunca lanza: mismo criterio que el
 * registro nativo (`registerForPushNotificationsAsync`), el llamador no
 * necesita distinguir el motivo, sólo si hay algo para registrar o no.
 */
export async function registerWebPush(vapidPublicKey: string): Promise<WebPushSubscription | null> {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return null;
  }
  if (!vapidPublicKey) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/push-worker.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // El tipado DOM de esta versión de TS es más estricto que el de
        // `Uint8Array` genérico (`ArrayBufferLike` vs. `ArrayBuffer`) aunque
        // en runtime es exactamente el `BufferSource` que pide la API.
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }

    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');
    if (!p256dhKey || !authKey) return null;

    return {
      endpoint: subscription.endpoint,
      p256dh: base64UrlEncode(p256dhKey),
      auth: base64UrlEncode(authKey),
    };
  } catch (err) {
    console.warn('[notifications] No se pudo registrar el push web:', err);
    return null;
  }
}

/** Da de baja la suscripción del navegador (además de avisarle al backend
 * por separado, ver `pushDevices.unregister`) -- si no, el navegador la
 * sigue teniendo activa aunque el backend ya haya olvidado el token. */
export async function unsubscribeWebPush(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/push-worker.js');
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // Best-effort: si falla, el peor caso es una suscripción del navegador
    // que ya no tiene backend del otro lado -- inofensivo.
  }
}
