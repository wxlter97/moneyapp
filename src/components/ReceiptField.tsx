import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReceiptImage, useRemoveReceipt, useUploadReceipt } from '@/api/queries';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import {
  isPdfType,
  pickReceiptDocument,
  pickReceiptImage,
  writePdfToTempFile,
  type PickedFile,
} from '@/lib/receipt';
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
  const [openingPdf, setOpeningPdf] = useState(false);
  const upload = useUploadReceipt();
  const remove = useRemoveReceipt();
  const existingReceipt = useReceiptImage(transactionId, hasReceipt);

  const previewUri = pendingFile?.uri ?? existingReceipt.data?.uri ?? null;
  const isPdf = isPdfType(pendingFile?.type ?? existingReceipt.data?.contentType);
  const loadingPreview = !pendingFile && hasReceipt && existingReceipt.isLoading;
  const busy = upload.isPending || remove.isPending;

  async function onPick(source: 'camera' | 'library' | 'document') {
    setPicking(false);
    const file = source === 'document' ? await pickReceiptDocument() : await pickReceiptImage(source);
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

  /** Ver el PDF con el visor del sistema: en web un `data:`/`blob:` URI se
   * abre solo en una pestaña nueva, pero en nativo hace falta un archivo de
   * verdad primero (iOS/Android no abren un `data:` URI con la app de PDF
   * del sistema) -- de ahí `writePdfToTempFile` sólo para ese caso. */
  async function onOpenPdf() {
    if (!previewUri) return;
    haptics.tap();
    if (Platform.OS === 'web' || !previewUri.startsWith('data:')) {
      Linking.openURL(previewUri).catch(() => haptics.error());
      return;
    }
    const base64 = existingReceipt.data?.base64;
    if (!base64) return;
    setOpeningPdf(true);
    try {
      const fileUri = writePdfToTempFile(base64, `recibo-${transactionId ?? Date.now()}.pdf`);
      await Linking.openURL(fileUri);
    } catch {
      haptics.error();
    } finally {
      setOpeningPdf(false);
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
            onPress={() => (previewUri && isPdf ? onOpenPdf() : previewUri && setViewerOpen(true))}
            disabled={!previewUri || openingPdf}
            accessibilityRole="button"
            accessibilityLabel={isPdf ? 'Abrir PDF' : 'Ver recibo'}
            className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-surface-2 active:opacity-70"
          >
            {openingPdf ? (
              <ActivityIndicator color={colors.textMuted} />
            ) : previewUri && isPdf ? (
              <Icon name="receipt" size={22} color={colors.textMuted} />
            ) : previewUri ? (
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
