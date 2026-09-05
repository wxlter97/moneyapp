import * as ImagePicker from 'expo-image-picker';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
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
