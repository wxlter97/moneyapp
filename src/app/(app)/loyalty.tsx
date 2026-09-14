import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Ver el comentario en `src/screens/LoyaltyScreen.tsx`: cuerpo cargado bajo
// demanda (pantalla Pro de uso ocasional), aparte de `src/app/` para que
// Expo Router no la registre también como su propia ruta.
const LoyaltyScreen = lazy(() => import('@/screens/LoyaltyScreen'));

export default function Loyalty() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Recompensas" />
      <Suspense fallback={<LoadingState />}>
        <LoyaltyScreen />
      </Suspense>
    </Screen>
  );
}
