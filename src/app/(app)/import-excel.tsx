import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Ver el comentario en `src/screens/ImportExcelScreen.tsx`: cuerpo cargado
// bajo demanda (pantalla Pro de uso ocasional), aparte de `src/app/` para
// que Expo Router no la registre también como su propia ruta.
const ImportExcelScreen = lazy(() => import('@/screens/ImportExcelScreen'));

export default function ImportExcel() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Importar desde Excel" />
      <Suspense fallback={<LoadingState />}>
        <ImportExcelScreen />
      </Suspense>
    </Screen>
  );
}
