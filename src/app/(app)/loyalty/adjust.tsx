import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Cuerpo cargado bajo demanda (ver `src/screens/LoyaltyScreen.tsx`).
const Body = lazy(() => import('@/screens/LoyaltyAdjustScreen'));

export default function LoyaltyAjustar() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Ajustar" />
      <Suspense fallback={<LoadingState />}>
        <Body />
      </Suspense>
    </Screen>
  );
}
