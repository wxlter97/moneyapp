import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// Ver el comentario en `src/screens/ShortcutsScreen.tsx`: cuerpo cargado
// bajo demanda (pantalla Pro de uso ocasional), aparte de `src/app/` para
// que Expo Router no la registre también como su propia ruta.
const ShortcutsScreen = lazy(() => import('@/screens/ShortcutsScreen'));

export default function Shortcuts() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Atajos" />
      <Suspense fallback={<LoadingState />}>
        <ShortcutsScreen />
      </Suspense>
    </Screen>
  );
}
