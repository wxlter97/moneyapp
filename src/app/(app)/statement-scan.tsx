import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Cuerpo cargado bajo demanda (ver `src/screens/StatementScanScreen.tsx`).
const StatementScanScreen = lazy(() => import('@/screens/StatementScanScreen'));

export default function StatementScan() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Leer estado de cuenta" />
      <Suspense fallback={<LoadingState />}>
        <StatementScanScreen />
      </Suspense>
    </Screen>
  );
}
