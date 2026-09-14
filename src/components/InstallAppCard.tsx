import { Platform, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { haptics } from '@/lib/haptics';
import { isIosSafari, useInstallPrompt } from '@/lib/pwaInstall';

/**
 * "Instalar app": sólo tiene sentido en la versión web (PWA) -- en las apps
 * nativas no se muestra nada. En Chrome/Edge/Android dispara el prompt
 * nativo del navegador; Safari/iOS no expone ese evento (ver
 * `lib/pwaInstall.ts`), así que ahí se muestran los pasos a mano en vez de
 * un botón que no podría hacer nada. Ya instalada (`display-mode:
 * standalone`) tampoco se muestra: no hay nada que ofrecer de nuevo.
 */
export function InstallAppCard() {
  const { available, installed, promptInstall } = useInstallPrompt();

  if (Platform.OS !== 'web') return null;
  if (installed) return null;
  if (!available && !isIosSafari()) return null;

  return (
    <Card title="Instalar app">
      {available ? (
        <>
          <Text className="text-text-muted mb-3 text-sm leading-5">
            Agrega Porsupuesto a tu pantalla de inicio: abre más rápido y ocupa toda la
            pantalla, sin la barra del navegador.
          </Text>
          <Button
            label="Instalar"
            onPress={() => {
              haptics.tap();
              void promptInstall();
            }}
          />
        </>
      ) : (
        <Text className="text-text-muted text-sm leading-5">
          En iPhone/iPad: tocá Compartir y luego &quot;Agregar a inicio&quot;.
        </Text>
      )}
    </Card>
  );
}
