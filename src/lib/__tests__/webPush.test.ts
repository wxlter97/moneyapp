import { registerWebPush, unsubscribeWebPush } from '@/lib/webPush';

// Cualquier base64url válido alcanza -- `urlBase64ToUint8Array` sólo
// necesita decodificarlo, no es una clave VAPID real.
const MOCK_VAPID_KEY =
  'BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ';

/**
 * `webPush.ts` sólo tiene sentido en un navegador (Notification,
 * ServiceWorker, PushManager) -- bajo test (entorno "node" de jest-expo,
 * sin DOM real) esos globals no existen, así que cada test los define a
 * mano y los limpia después. Sirve igual para probar la lógica pura del
 * módulo: detección de soporte, reuso de una suscripción existente vs.
 * crear una nueva, y la codificación base64url de las claves.
 */
describe('webPush', () => {
  const originalWindow = (global as Record<string, unknown>).window;
  const originalNavigator = (global as Record<string, unknown>).navigator;
  const originalNotification = (global as Record<string, unknown>).Notification;

  afterEach(() => {
    (global as Record<string, unknown>).window = originalWindow;
    (global as Record<string, unknown>).navigator = originalNavigator;
    (global as Record<string, unknown>).Notification = originalNotification;
  });

  function stubBrowserWithPush({
    permission = 'granted',
    existingSubscription = null as null | { endpoint: string },
    subscribe = jest.fn(),
  } = {}) {
    const p256dh = new Uint8Array([1, 2, 3, 4]).buffer;
    const auth = new Uint8Array([9, 9]).buffer;
    const subscription = {
      endpoint: 'https://push.example.com/abc',
      getKey: (name: string) => (name === 'p256dh' ? p256dh : auth),
      unsubscribe: jest.fn(async () => true),
    };
    const pushManager = {
      getSubscription: jest.fn(async () => (existingSubscription ? subscription : null)),
      subscribe: subscribe.mockImplementation(async () => subscription),
    };
    const registration = { pushManager };
    const serviceWorker = {
      register: jest.fn(async () => registration),
      getRegistration: jest.fn(async () => registration),
      ready: Promise.resolve(registration),
    };

    (global as Record<string, unknown>).window = { PushManager: {}, Notification: {} };
    (global as Record<string, unknown>).navigator = { serviceWorker };
    (global as Record<string, unknown>).Notification = {
      requestPermission: jest.fn(async () => permission),
    };

    return { pushManager, serviceWorker, subscription };
  }

  describe('registerWebPush', () => {
    it('sin soporte de push en el navegador, devuelve null (no lanza)', async () => {
      (global as Record<string, unknown>).window = undefined;
      (global as Record<string, unknown>).navigator = undefined;
      expect(await registerWebPush(MOCK_VAPID_KEY)).toBeNull();
    });

    it('sin vapidPublicKey configurada, devuelve null', async () => {
      stubBrowserWithPush();
      expect(await registerWebPush('')).toBeNull();
    });

    it('si el usuario rechaza el permiso, devuelve null', async () => {
      stubBrowserWithPush({ permission: 'denied' });
      expect(await registerWebPush(MOCK_VAPID_KEY)).toBeNull();
    });

    it('sin suscripción previa, crea una nueva y codifica las claves en base64url', async () => {
      const { pushManager } = stubBrowserWithPush({ existingSubscription: null });
      const result = await registerWebPush(MOCK_VAPID_KEY);

      expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        endpoint: 'https://push.example.com/abc',
        p256dh: expect.any(String),
        auth: expect.any(String),
      });
      // Sin "+"/"/" ni "=" de relleno -- es base64url, no base64 a secas.
      expect(result?.p256dh).not.toMatch(/[+/=]/);
      expect(result?.auth).not.toMatch(/[+/=]/);
    });

    it('con una suscripción previa, la reusa en vez de pedir una nueva', async () => {
      const { pushManager } = stubBrowserWithPush({ existingSubscription: { endpoint: 'x' } });
      const result = await registerWebPush(MOCK_VAPID_KEY);

      expect(pushManager.subscribe).not.toHaveBeenCalled();
      expect(result?.endpoint).toBe('https://push.example.com/abc');
    });
  });

  describe('unsubscribeWebPush', () => {
    it('sin soporte de service worker, no lanza', async () => {
      (global as Record<string, unknown>).navigator = undefined;
      await expect(unsubscribeWebPush()).resolves.toBeUndefined();
    });

    it('con una suscripción activa, la da de baja', async () => {
      const { subscription } = stubBrowserWithPush({ existingSubscription: { endpoint: 'x' } });
      await unsubscribeWebPush();
      expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('sin suscripción activa, no lanza', async () => {
      stubBrowserWithPush({ existingSubscription: null });
      await expect(unsubscribeWebPush()).resolves.toBeUndefined();
    });
  });
});
