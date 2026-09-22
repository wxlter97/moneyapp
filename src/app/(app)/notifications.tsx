import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Ver el comentario en `src/screens/NotificationsScreen.tsx`: cuerpo
// cargado bajo demanda (pantalla de Plus, ver ECONOMIA-POR-PLAN.md), aparte
// de `src/app/` para que Expo Router no la registre también como su propia ruta.
const NotificationsScreen = lazy(() => import('@/screens/NotificationsScreen'));

export default function NotificationsSettings() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Notificaciones" />
      <Suspense fallback={<LoadingState />}>
        <NotificationsScreen />
      </Suspense>
    </Screen>
  );
}
