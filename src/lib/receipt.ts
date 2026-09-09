import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

export const RECEIPT_PDF_TYPE = 'application/pdf';

/** `<Image>` (RN) no puede dibujar un PDF -- hay que mostrar otra cosa. */
export function isPdfType(mimeType: string | null | undefined): boolean {
  return mimeType === RECEIPT_PDF_TYPE;
}

/**
 * Abre la cámara o la galería para elegir la foto de un recibo. Devuelve
 * `null` si se canceló o no se otorgó el permiso (no lanza: el llamador no
 * necesita distinguir "cancelado" de "sin permiso", en los dos casos no hay
 * nada que subir).
 */
export async function pickReceiptImage(source: 'camera' | 'library'): Promise<PickedFile | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `recibo-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  };
}

/** Igual que `pickReceiptImage`, pero para el PDF de un comprobante (p. ej.
 * el que manda el banco por correo) -- sin pedir permiso: el selector de
 * documentos del sistema no lo necesita, a diferencia de cámara/galería. */
export async function pickReceiptDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: RECEIPT_PDF_TYPE });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || `recibo-${Date.now()}.pdf`,
    type: asset.mimeType || RECEIPT_PDF_TYPE,
  };
}

/**
 * Escribe un PDF en base64 a un archivo temporal y devuelve su `file://` --
 * hace falta para poder abrirlo con `Linking.openURL` en nativo: a
 * diferencia del navegador, iOS/Android no saben abrir un `data:` URI con
 * la app de PDF del sistema.
 */
export function writePdfToTempFile(base64: string, filename: string): string {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}
