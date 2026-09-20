import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { pushDevices } from '@/api/resources';
import { usePushPrefStore } from '@/store/pushPref';
import { getWebPushSubscription, registerWebPush, resetWebPushSubscription } from '@/lib/webPush';

// Cómo se muestra un push que llega con la app abierta (foreground). Sin
// esto, expo-notifications no la muestra en absoluto mientras la app está al
// frente. `shouldShowAlert` quedó deprecado a favor de estos dos campos.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type RegisteredDevice =
  | { token: string; platform: 'ios' | 'android' }
  | { token: string; platform: 'web'; p256dh: string; auth: string };

// Se cachea en memoria (no hace falta persistirlo: se vuelve a pedir en cada
// arranque) para poder des-registrar el mismo valor al cerrar sesión sin
// tener que volver a golpear la API de Expo.
let cachedDevice: RegisteredDevice | null = null;

export function getCachedPushDevice(): RegisteredDevice | null {
  return cachedDevice;
}

/**
 * Pide permiso y devuelve el token de Expo Push de este dispositivo, o
 * `null` si no se pudo — sin lanzar nunca: el llamador no necesita
 * distinguir "el usuario dijo que no" de "es un simulador" de "falta
 * configurar `extra.eas.projectId`" (ver README), en todos los casos no hay
 * nada para registrar contra el backend.
 *
 * OJO: desde el SDK 53 de Expo, las push notifications remotas NO andan en
 * Expo Go (ni iOS ni Android) — hace falta un development build. En Expo Go
 * esta función simplemente no va a conseguir un token nunca; es esperable.
 */
export async function registerForPushNotificationsAsync(): Promise<RegisteredDevice | null> {
  if (Platform.OS === 'web') {
    // Distinto protocolo por completo (Web Push/VAPID en vez de Expo Push):
    // `vapidPublicKey` vacío (backend sin configurar, ver .env.example) ya
    // hace que `registerWebPush` devuelva null sin pedir permiso siquiera.
    const vapidPublicKey = await pushDevices.vapidPublicKey().catch(() => '');
    const subscription = await registerWebPush(vapidPublicKey);
    if (!subscription) return null;
    cachedDevice = { token: subscription.endpoint, platform: 'web', p256dh: subscription.p256dh, auth: subscription.auth };
    return cachedDevice;
  }
  if (!Device.isDevice) return null; // simulador/emulador: no hay push real

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn(
      '[notifications] Falta extra.eas.projectId en app.json — corré `eas init` para habilitar los push.',
    );
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedDevice = { token, platform: Platform.OS as 'ios' | 'android' };
    return cachedDevice;
  } catch (err) {
    console.warn('[notifications] No se pudo obtener el push token:', err);
    return null;
  }
}

export function clearCachedPushDevice() {
  cachedDevice = null;
}

/** `pushDevices.register`, pero mandando las claves p256dh/auth cuando
 * corresponde -- para no repetir el chequeo `platform === 'web'` en cada
 * lugar que registra un `RegisteredDevice`. */
export function registerDevice(device: RegisteredDevice): Promise<void> {
  return device.platform === 'web'
    ? pushDevices.register(device.token, 'web', { p256dh: device.p256dh, auth: device.auth })
    : pushDevices.register(device.token, device.platform);
}

/** Se dispara al tocar una notificación (app en background o cerrada). */
export function addNotificationTapListener(
  callback: (data: Record<string, unknown>) => void,
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response.notification.request.content.data ?? {});
  });
  return () => sub.remove();
}

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushStatus {
  /** Permiso del sistema/navegador. */
  permission: PushPermission;
  /** Si este dispositivo tiene hoy una suscripción de push viva. */
  subscribed: boolean;
  /** Si el usuario quiere recibirlos (`usePushPrefStore`). */
  enabled: boolean;
}

/** Estado real de los avisos en ESTE dispositivo: sirve para mostrar si de verdad
 * están activos, no sólo si el permiso está concedido. */
export async function getPushStatus(): Promise<PushStatus> {
  const enabled = usePushPrefStore.getState().enabled;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window) || !('PushManager' in window)) {
      return { permission: 'unsupported', subscribed: false, enabled };
    }
    const subscription = await getWebPushSubscription();
    return { permission: Notification.permission, subscribed: subscription !== null, enabled };
  }
  const settings = await Notifications.getPermissionsAsync().catch(() => null);
  if (!settings) return { permission: 'unsupported', subscribed: false, enabled };
  return {
    permission: settings.granted ? 'granted' : settings.canAskAgain ? 'default' : 'denied',
    subscribed: cachedDevice !== null,
    enabled,
  };
}

/**
 * Vuelve a registrar este dispositivo desde cero: en la web descarta la
 * suscripción actual (queda un endpoint nuevo) y la registra de nuevo en el
 * servidor. Es lo que hay que hacer cuando los avisos dejan de llegar (el
 * navegador revocó la suscripción, se limpiaron los datos del sitio…). También
 * vuelve a encender los avisos si estaban apagados. `null` si no se pudo (sin
 * permiso, sin soporte…).
 */
export async function revalidatePush(): Promise<RegisteredDevice | null> {
  usePushPrefStore.getState().setEnabled(true);
  if (Platform.OS === 'web') {
    const old = await resetWebPushSubscription();
    if (old) await pushDevices.unregister(old).catch(() => {});
  }
  const device = await registerForPushNotificationsAsync();
  if (device) await registerDevice(device);
  return device;
}

/** Apaga los avisos en este dispositivo: da de baja la suscripción, la borra del
 * servidor y recuerda la decisión para que la app no se vuelva a registrar sola. */
export async function disablePush(): Promise<void> {
  usePushPrefStore.getState().setEnabled(false);
  const tokens = new Set<string>();
  if (cachedDevice) tokens.add(cachedDevice.token);
  if (Platform.OS === 'web') {
    const old = await resetWebPushSubscription();
    if (old) tokens.add(old);
  }
  await Promise.all([...tokens].map((token) => pushDevices.unregister(token).catch(() => {})));
  clearCachedPushDevice();
}
