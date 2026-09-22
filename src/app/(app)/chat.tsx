import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAIStatus, useAskChat } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Chat sobre tus finanzas: la IA nunca toca la base directo, elige una
 * función de reportes ya existente y sólo redacta la respuesta con lo que
 * ésta devuelve (ver `apps.ai.chat` en el backend, backlog punto 5).
 *
 * El historial es sólo de esta pantalla -- no se guarda en el servidor ni
 * sobrevive a cerrarla, a propósito ("al menos al principio", backlog). Mismas
 * reglas que las otras entradas de IA: sin IA en el backend no aparece nada
 * más que el aviso, y con la cuota agotada el campo queda deshabilitado
 * diciendo por qué.
 */
export default function ChatScreen() {
  const colors = useColors();
  const status = useAIStatus();
  const ask = useAskChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const quota = status.data?.quotas?.chat;
  const agotada = quota?.remaining === 0;

  async function onSend() {
    const texto = question.trim();
    if (!texto || agotada || ask.isPending) return;
    setError(null);
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: texto }]);
    try {
      const result = await ask.mutateAsync(texto);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer }]);
    } catch (err) {
      haptics.error();
      // La pregunta no queda perdida: vuelve al campo para reintentar sin
      // volver a escribirla, mismo criterio que `ParseTextField`.
      setMessages((prev) => prev.slice(0, -1));
      setQuestion(texto);
      setError(errorMessage(err, 'No se pudo responder ahora mismo. Probá de nuevo.'));
    }
  }

  if (status.data && !status.data.enabled) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ModalHeader title="Chat de finanzas" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text-muted text-center text-sm">
            Esta función todavía no está disponible.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Chat de finanzas" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-3 px-4 py-3" keyboardShouldPersistTaps="handled">
          <View className="gap-1 rounded-2xl bg-surface-2 px-3 py-2.5">
            <Text className="text-text-muted text-xs">
              Puede equivocarse y no da consejos de inversión: sólo describe lo que tus reportes
              ya calculan.
            </Text>
          </View>

          {messages.length === 0 ? (
            <Text className="text-text-muted px-1 text-sm">
              Preguntá algo como &quot;¿cuánto gasté en comida este mes?&quot; o &quot;¿qué tengo
              programado esta semana?&quot;.
            </Text>
          ) : (
            messages.map((message, i) => (
              <View
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                  message.role === 'user' ? 'self-end bg-primary' : 'self-start bg-surface-2'
                }`}
              >
                <Text
                  className="text-sm"
                  style={{ color: message.role === 'user' ? '#FFFFFF' : colors.text }}
                >
                  {message.text}
                </Text>
              </View>
            ))
          )}

          {ask.isPending ? (
            <View className="max-w-[85%] flex-row items-center gap-2 self-start rounded-2xl bg-surface-2 px-3 py-2.5">
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text className="text-text-muted text-sm">Pensando...</Text>
            </View>
          ) : null}

          {error ? <Text className="text-expense px-1 text-xs">{error}</Text> : null}
        </ScrollView>

        <View className="gap-1.5 border-t border-border/30 px-4 pb-2 pt-2">
          {agotada ? (
            <Text className="text-text-muted text-xs">
              Se acabaron las preguntas de este mes en tu plan. Se reponen el 1.
            </Text>
          ) : quota?.remaining != null ? (
            <Text className="text-text-muted text-xs">
              Te quedan {quota.remaining} de {quota.limit} preguntas este mes.
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2 rounded-xl bg-surface-2 px-3">
            <TextInput
              value={question}
              onChangeText={setQuestion}
              onSubmitEditing={onSend}
              editable={!agotada && !ask.isPending}
              placeholder="Preguntá sobre tus finanzas"
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              accessibilityLabel="Escribir una pregunta"
              className="text-text flex-1 py-2.5 text-sm"
            />
            {question.trim() && !ask.isPending ? (
              <Pressable
                onPress={onSend}
                disabled={agotada}
                accessibilityRole="button"
                accessibilityLabel="Enviar la pregunta"
                className="py-2 active:opacity-70"
              >
                <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                  Enviar
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
