import { router } from 'expo-router';

/**
 * Cierra el modal actual; si no hay pila previa (deep-link), vuelve al
 * dashboard. Vive en su propio módulo (en vez de `ModalHeader.tsx`) para que
 * `Screen.tsx` lo pueda usar sin crear un import circular entre ambos
 * (`ModalHeader` a su vez consume el gesto de `Screen`).
 */
export function dismissModal() {
  if (router.canGoBack()) router.back();
  else router.replace('/dashboard');
}
