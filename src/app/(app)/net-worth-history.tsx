import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Ver el comentario en `src/screens/NetWorthHistoryScreen.tsx`: cuerpo
// cargado bajo demanda (pantalla Pro de uso ocasional), aparte de
// `src/app/` para que Expo Router no la registre también como su propia
// ruta.
const NetWorthHistoryScreen = lazy(() => import('@/screens/NetWorthHistoryScreen'));

export default function NetWorthHistory() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Patrimonio neto" />
      <Suspense fallback={<LoadingState />}>
        <NetWorthHistoryScreen />
      </Suspense>
    </Screen>
  );
}
