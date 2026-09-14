import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Ver el comentario en `src/screens/ExportScreen.tsx`: cuerpo cargado bajo
// demanda (pantalla Pro de uso ocasional), aparte de `src/app/` para que
// Expo Router no la registre también como su propia ruta.
const ExportScreen = lazy(() => import('@/screens/ExportScreen'));

export default function Export() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Exportar datos" />
      <Suspense fallback={<LoadingState />}>
        <ExportScreen />
      </Suspense>
    </Screen>
  );
}
