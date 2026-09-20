import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Cuerpo cargado bajo demanda (ver `src/screens/LoyaltyScreen.tsx`).
const LoyaltyWalletScreen = lazy(() => import('@/screens/LoyaltyWalletScreen'));

export default function LoyaltyWallet() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Recompensas" />
      <Suspense fallback={<LoadingState />}>
        <LoyaltyWalletScreen />
      </Suspense>
    </Screen>
  );
}
