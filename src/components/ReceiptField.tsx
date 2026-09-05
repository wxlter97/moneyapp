import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReceiptImage, useRemoveReceipt, useUploadReceipt } from '@/api/queries';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import { pickReceiptImage, type PickedFile } from '@/lib/receipt';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface ReceiptFieldProps {
  /** `undefined` mientras la transacción todavía no se guardó (alta nueva):
   * en ese caso el archivo elegido queda en `pendingFile`, sin subir, hasta
   * que el formulario cree la transacción y suba el pendiente. */
  transactionId?: string;
  hasReceipt: boolean;
  pendingFile: PickedFile | null;
  onPendingFileChange: (file: PickedFile | null) => void;
}

/**
 * Adjuntar/ver/quitar la foto del recibo de una transacción. Cubre los dos
 * modos: transacción ya guardada (sube/borra contra la API al toque) y
 * transacción nueva todavía sin id (guarda el archivo elegido en memoria;
 * `TransactionForm` lo sube apenas el alta responde con el id real).
 */
export function ReceiptField({
  transactionId,
  hasReceipt,
  pendingFile,
  onPendingFileChange,
}: ReceiptFieldProps) {
  const colors = useColors();
  const [picking, setPicking] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const upload = useUploadReceipt();
  const remove = useRemoveReceipt();
  const existingImage = useReceiptImage(transactionId, hasReceipt);

  const previewUri = pendingFile?.uri ?? existingImage.data ?? null;
  const loadingPreview = !pendingFile && hasReceipt && existingImage.isLoading;
  const busy = upload.isPending || remove.isPending;

  async function onPick(source: 'camera' | 'library') {
    setPicking(false);
    const file = await pickReceiptImage(source);
    if (!file) return;

    if (!transactionId) {
      onPendingFileChange(file);
      haptics.success();
      return;
    }
    try {
      await upload.mutateAsync({ id: transactionId, file });
      haptics.success();
    } catch {
      haptics.error();
    }
  }

  async function onRemove() {
    if (!transactionId) {
      onPendingFileChange(null);
      return;
    }
    try {
      await remove.mutateAsync(transactionId);
      haptics.selection();
    } catch {
      haptics.error();
    }
  }

  return (
    <View className="gap-2">
      <Text className="text-text-muted text-sm">Recibo (opcional)</Text>

      {previewUri || loadingPreview ? (
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => previewUri && setViewerOpen(true)}
            disabled={!previewUri}
            accessibilityRole="button"
            accessibilityLabel="Ver recibo"
            className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-surface-2 active:opacity-70"
          >
            {previewUri ? (
              <Image source={{ uri: previewUri }} className="h-14 w-14" resizeMode="cover" />
            ) : (
              <ActivityIndicator color={colors.textMuted} />
            )}
          </Pressable>
          <Pressable
            onPress={onRemove}
            disabled={busy}
            accessibilityRole="button"
            className={`rounded-full border border-border px-3 py-1.5 ${busy ? 'opacity-50' : 'active:opacity-70'}`}
          >
            {remove.isPending ? (
              <ActivityIndicator color={colors.textMuted} size="small" />
            ) : (
              <Text className="text-expense text-xs" style={{ fontFamily: fonts.semibold }}>
                Quitar
              </Text>
            )}
          </Pressable>
          {upload.isPending ? <ActivityIndicator color={colors.textMuted} size="small" /> : null}
        </View>
      ) : picking ? (
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
        </View>
      ) : (
        <Pressable
          onPress={() => {
            haptics.tap();
            setPicking(true);
          }}
          className="flex-row items-center gap-2 self-start rounded-xl border border-dashed border-border px-3 py-2.5 active:opacity-70"
          accessibilityRole="button"
        >
          <Icon name="camera" size={15} color={colors.textMuted} />
          <Text className="text-text-muted text-sm">Adjuntar recibo</Text>
        </Pressable>
      )}

      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View className="flex-1 bg-black/90">
          {/* Fondo: cubre toda la pantalla y cierra al tocar. Un botón
              propio (el de cerrar, más abajo) NO puede ir adentro de este
              — anidar <button> es HTML inválido y en web el click del de
              adentro también dispara el de afuera. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setViewerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          />
          <View pointerEvents="none" className="flex-1 items-center justify-center p-6">
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={{ width: '100%', height: '80%' }}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <Pressable
            onPress={() => setViewerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            className="absolute right-5 h-10 w-10 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
            style={{ top: 56 }}
          >
            <Icon name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
