import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { AudioModule, RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';

import { useAIStatus, useParseVoice } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { ParseCandidate } from '@/api/types';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface VoiceInputButtonProps {
  /** Para que la respuesta traiga los posibles duplicados de esa cartera. */
  walletId: string | null;
  onParsed: (candidate: ParseCandidate) => void;
}

// En nativo `expo-audio` graba directo a `.m4a` (AAC en contenedor MP4), que
// Gemini acepta igual que `audio/aac` (ver `apps.ai.parsing.
// AUDIO_CONTENT_TYPES` en el backend). En web usa `MediaRecorder`, y ahí se le
// pide el mismo contenedor -- Safari sabe grabarlo; Chrome/Firefox de
// escritorio sólo saben `audio/webm`, que el backend no acepta, así que en
// esos navegadores el botón no aparece (ver `canRecordSupportedFormat`).
const AUDIO_MIME_TYPE = 'audio/mp4';
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  web: { mimeType: AUDIO_MIME_TYPE, bitsPerSecond: 128000 },
};

function canRecordSupportedFormat(): boolean {
  if (Platform.OS !== 'web') return true;
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE);
}

/**
 * "Dictar": graba, manda el audio a `/ai/voice/` y le pasa al formulario los
 * mismos campos editables que el texto libre -- mismo contrato de respuesta
 * que `ParseTextField` (backlog, punto 3.2), y comparte su misma cuota
 * (`quotas.parse`): no es una operación aparte, es la misma entrada por otro
 * canal.
 *
 * Mismas reglas que las otras entradas de IA: no aparece sin IA en el
 * backend, con la cuota agotada queda deshabilitado diciendo por qué. Se le
 * suma una tercera: tampoco aparece si el navegador no sabe grabar en un
 * formato que Gemini acepte.
 */
export function VoiceInputButton({ walletId, onParsed }: VoiceInputButtonProps) {
  const colors = useColors();
  const status = useAIStatus();
  const parseVoice = useParseVoice();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder);
  const [error, setError] = useState<string | null>(null);

  const quota = status.data?.quotas?.parse;
  const agotada = quota?.remaining === 0;

  if (!status.data?.enabled || !canRecordSupportedFormat()) return null;

  async function onStart() {
    if (agotada) return;
    setError(null);
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      setError('Sin permiso de micrófono.');
      return;
    }
    haptics.tap();
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function onStop() {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) return;
    try {
      const candidate = await parseVoice.mutateAsync({
        file: { uri, name: `dictado${RECORDING_OPTIONS.extension}`, type: AUDIO_MIME_TYPE },
        wallet: walletId,
      });
      haptics.success();
      onParsed(candidate);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo procesar el audio. Probá de nuevo o escribilo a mano.'));
    }
  }

  if (parseVoice.isPending) {
    return (
      <View className="flex-row items-center justify-center gap-2 rounded-xl bg-surface-2 py-3">
        <ActivityIndicator color={colors.textMuted} size="small" />
        <Text className="text-text-muted text-sm">Escuchando el audio...</Text>
      </View>
    );
  }

  if (recorderState.isRecording) {
    const seconds = Math.floor(recorderState.durationMillis / 1000);
    return (
      <View className="gap-2">
        <Pressable
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="Detener grabación y enviar"
          className="flex-row items-center justify-center gap-2 rounded-xl border border-expense/40 bg-expense/10 py-3 active:opacity-70"
        >
          <View className="h-2.5 w-2.5 rounded-full bg-expense" />
          <Text className="text-expense text-sm" style={{ fontFamily: fonts.semibold }}>
            Grabando... {seconds}s (tocá para enviar)
          </Text>
        </Pressable>
        {error ? <Text className="text-expense text-xs">{error}</Text> : null}
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={onStart}
        disabled={agotada}
        accessibilityRole="button"
        accessibilityState={{ disabled: agotada }}
        accessibilityLabel="Dictar la transacción"
        className={`flex-row items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-3 ${
          agotada ? 'opacity-50' : 'active:opacity-70'
        }`}
      >
        <Icon name="mic" size={16} color={colors.primary} />
        <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
          Dictar
        </Text>
      </Pressable>

      {agotada ? (
        <Text className="text-text-muted text-xs">
          Se acabaron los textos/dictados de este mes en tu plan. Se reponen el 1.
        </Text>
      ) : null}

      {error ? <Text className="text-expense text-xs">{error}</Text> : null}
    </View>
  );
}
