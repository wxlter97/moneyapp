import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Cuerpo cargado bajo demanda (ver `src/screens/LoyaltyScreen.tsx`).
const Body = lazy(() => import('@/screens/LoyaltyRedeemScreen'));

export default function LoyaltyCanjear() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Canjear" />
      <Suspense fallback={<LoadingState />}>
        <Body />
      </Suspense>
    </Screen>
  );
}
