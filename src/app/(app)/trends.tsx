import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Ver el comentario en `src/screens/TrendsScreen.tsx`: cuerpo cargado bajo
// demanda (pantalla Pro de uso ocasional), aparte de `src/app/` para que
// Expo Router no la registre también como su propia ruta.
const TrendsScreen = lazy(() => import('@/screens/TrendsScreen'));

export default function Trends() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Tendencias" />
      <Suspense fallback={<LoadingState />}>
        <TrendsScreen />
      </Suspense>
    </Screen>
  );
}
