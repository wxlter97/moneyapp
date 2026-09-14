import { lazy, Suspense } from 'react';

import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';

// El cuerpo real vive en `src/screens/` (no en `src/app/`) y se carga bajo
// demanda: es una pantalla Pro de uso ocasional, no tiene sentido bajarla en
// el bundle inicial de todo el mundo. Si viviera acá dentro, Expo Router
// también la registraría como ruta propia -- por eso el archivo aparte.
const BackupScreen = lazy(() => import('@/screens/BackupScreen'));

export default function Backup() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Respaldo" />
      <Suspense fallback={<LoadingState />}>
        <BackupScreen />
      </Suspense>
    </Screen>
  );
}
