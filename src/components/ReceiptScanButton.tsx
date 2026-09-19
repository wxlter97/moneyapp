import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAIStatus, useScanReceipt } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { ReceiptCandidate } from '@/api/types';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import { pickReceiptDocument, pickReceiptImage, type PickedFile } from '@/lib/receipt';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface ReceiptScanButtonProps {
  /** Para que la respuesta traiga los posibles duplicados de esa cartera. */
  walletId: string | null;
  /** El archivo vuelve junto con la candidata: es el mismo que después se
   * adjunta como recibo de la transacción, así el usuario no lo elige dos
   * veces. */
  onScanned: (candidate: ReceiptCandidate, file: PickedFile) => void;
}

/**
 * "Escanear recibo": saca la foto, la manda a leer y le pasa al formulario los
 * campos ya llenos.
 *
 * **No se muestra si el backend no tiene IA configurada** — eso lo dice
 * `useAIStatus()`, y es la razón de que exista ese endpoint: más vale que el
 * botón no esté a que esté y falle al tocarlo.
 *
 * Cuando la cuota del mes se agotó el botón sigue a la vista pero deshabilitado,
 * diciendo por qué. Esconderlo haría que la función pareciera no existir.
 */
export function ReceiptScanButton({ walletId, onScanned }: ReceiptScanButtonProps) {
  const colors = useColors();
  const status = useAIStatus();
  const scan = useScanReceipt();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quota = status.data?.quotas?.receipt;
  const agotada = quota?.remaining === 0;

  if (!status.data?.enabled) return null;

  async function onPick(source: 'camera' | 'library' | 'document') {
    setPicking(false);
    setError(null);
    const file = source === 'document' ? await pickReceiptDocument() : await pickReceiptImage(source);
    if (!file) return;

    try {
      const candidate = await scan.mutateAsync({ file, wallet: walletId });
      haptics.success();
      onScanned(candidate, file);
    } catch (err) {
      haptics.error();
      // El backend distingue 429 (se acabó la cuota) de 503 (Gemini no
      // contestó) con mensajes propios; los dos casos se leen igual acá.
      setError(errorMessage(err, 'No se pudo leer el recibo. Probá de nuevo o cargalo a mano.'));
    }
  }

  if (scan.isPending) {
    return (
      <View className="flex-row items-center justify-center gap-2 rounded-xl bg-surface-2 py-3">
        <ActivityIndicator color={colors.textMuted} size="small" />
        <Text className="text-text-muted text-sm">Leyendo el recibo...</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {picking ? (
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onPick('camera')}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2.5 active:opacity-70"
            accessibilityRole="button"
          >
            <Icon name="camera" size={15} color={colors.text} />
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              Tomar foto
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onPick('library')}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2.5 active:opacity-70"
            accessibilityRole="button"
          >
            <Icon name="image" size={15} color={colors.text} />
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              Galería
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onPick('document')}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2.5 active:opacity-70"
            accessibilityRole="button"
          >
            <Icon name="receipt" size={15} color={colors.text} />
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              PDF
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            if (agotada) return;
            haptics.tap();
            setPicking(true);
          }}
          disabled={agotada}
          accessibilityRole="button"
          accessibilityState={{ disabled: agotada }}
          className={`flex-row items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-3 ${
            agotada ? 'opacity-50' : 'active:opacity-70'
          }`}
        >
          <Icon name="camera" size={16} color={colors.primary} />
          <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
            Escanear recibo
          </Text>
        </Pressable>
      )}

      {agotada ? (
        <Text className="text-text-muted text-xs">
          Se acabaron los recibos de este mes en tu plan. Se reponen el 1.
        </Text>
      ) : quota?.remaining != null ? (
        <Text className="text-text-muted text-xs">
          Te quedan {quota.remaining} de {quota.limit} este mes.
        </Text>
      ) : null}

      {error ? <Text className="text-expense text-xs">{error}</Text> : null}
    </View>
  );
}
