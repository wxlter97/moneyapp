import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

export interface RegisteredDevice {
  token: string;
  platform: 'ios' | 'android';
}

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
  if (Platform.OS === 'web') return null; // push web necesita otra config (VAPID) — fuera de alcance
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

/** Se dispara al tocar una notificación (app en background o cerrada). */
export function addNotificationTapListener(
  callback: (data: Record<string, unknown>) => void,
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response.notification.request.content.data ?? {});
  });
  return () => sub.remove();
}
