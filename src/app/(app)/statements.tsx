import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Ver el comentario en `src/screens/StatementsScreen.tsx`: cuerpo cargado
// bajo demanda (pantalla de Plus, ver ECONOMIA-POR-PLAN.md), aparte de
// `src/app/` para que Expo Router no la registre también como su propia ruta.
const StatementsScreen = lazy(() => import('@/screens/StatementsScreen'));

export default function Statements() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Estado de cuenta" />
      <Suspense fallback={<LoadingState />}>
        <StatementsScreen />
      </Suspense>
    </Screen>
  );
}
