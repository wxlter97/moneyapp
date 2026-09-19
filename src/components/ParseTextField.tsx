import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useAIStatus, useParseText } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { ParseCandidate } from '@/api/types';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface ParseTextFieldProps {
  /** La cartera que el usuario ya tiene elegida: sirve para buscar duplicados
   * cuando la frase no nombra ninguna. */
  walletId: string | null;
  onParsed: (candidate: ParseCandidate) => void;
}

/**
 * "Escribilo en una línea": una frase suelta llena los campos del formulario.
 *
 * Las mismas reglas que `ReceiptScanButton`, y a propósito — son la misma
 * función con otra entrada: no aparece si el backend no tiene IA, con la cuota
 * agotada queda deshabilitado diciendo por qué, y lo que devuelve va a campos
 * editables que el usuario confirma.
 */
export function ParseTextField({ walletId, onParsed }: ParseTextFieldProps) {
  const colors = useColors();
  const status = useAIStatus();
  const parse = useParseText();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const quota = status.data?.quotas?.parse;
  const agotada = quota?.remaining === 0;

  if (!status.data?.enabled) return null;

  async function onSubmit() {
    const frase = text.trim();
    if (!frase || agotada || parse.isPending) return;
    setError(null);
    try {
      const candidate = await parse.mutateAsync({ text: frase, wallet: walletId });
      haptics.success();
      // La frase se limpia sólo si sirvió: si falló, queda para reintentar sin
      // volver a escribirla.
      setText('');
      onParsed(candidate);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo leer la frase. Probá de nuevo o cargala a mano.'));
    }
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2 rounded-xl bg-surface-2 px-3">
        <Icon name="bolt" size={15} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={onSubmit}
          editable={!agotada && !parse.isPending}
          placeholder="Escribilo: gasté 12.50 en almuerzo"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          accessibilityLabel="Describir la transacción en una línea"
          className="text-text flex-1 py-2.5 text-sm"
        />
        {parse.isPending ? (
          <ActivityIndicator color={colors.textMuted} size="small" />
        ) : text.trim() ? (
          <Pressable
            onPress={onSubmit}
            accessibilityRole="button"
            accessibilityLabel="Leer la frase"
            className="py-2 active:opacity-70"
          >
            <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
              Leer
            </Text>
          </Pressable>
        ) : null}
      </View>

      {agotada ? (
        <Text className="text-text-muted text-xs">
          Se acabaron los textos de este mes en tu plan. Se reponen el 1.
        </Text>
      ) : null}

      {error ? <Text className="text-expense text-xs">{error}</Text> : null}
    </View>
  );
}
