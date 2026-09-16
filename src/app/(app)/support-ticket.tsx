import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useReplySupportTicket, useSupportTicket } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { SupportTicketMessage, SupportTicketStatus, SupportTicketType } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { fonts } from '@/theme/typography';

const TYPE_LABEL: Record<SupportTicketType, string> = {
  bug: 'Error',
  query: 'Consulta',
  suggestion: 'Sugerencia',
};

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
};

function MessageBubble({ message }: { message: SupportTicketMessage }) {
  const fromSupport = message.is_staff_reply;
  return (
    <View className={`gap-1 rounded-2xl p-3 ${fromSupport ? 'self-start bg-surface-2' : 'self-end bg-primary/10'}`}>
      <Text className="text-text-muted text-[11px]" style={{ fontFamily: fonts.semibold }}>
        {fromSupport ? message.author_name ?? 'Soporte' : 'Vos'} · {formatDateTime(message.created_at)}
      </Text>
      <Text className="text-text text-sm">{message.body}</Text>
    </View>
  );
}

/** Hilo de un ticket: el reporte original + las respuestas (mías o de
 * soporte). Se puede agregar más contexto en cualquier momento con
 * "Agregar mensaje" -- no hace falta abrir otro ticket. */
export default function SupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketQ = useSupportTicket(id);
  const reply = useReplySupportTicket();

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ticket = ticketQ.data;

  async function onReply() {
    const message = draft.trim();
    if (!message || !id) return;
    setError(null);
    try {
      await reply.mutateAsync({ id, message });
      setDraft('');
      haptics.success();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo mandar el mensaje.'));
    }
  }

  if (ticketQ.isLoading || !ticket) {
    return (
      <Screen edges={['top', 'bottom']} variant="drawer">
        <ModalHeader title="Reporte" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']} variant="drawer">
      <ModalHeader title={ticket.subject} />
      <ScrollView contentContainerClassName="gap-3 py-2" keyboardShouldPersistTaps="handled">
        <Card>
          <Text className="text-text-muted text-xs">
            {TYPE_LABEL[ticket.type]} · {STATUS_LABEL[ticket.status]} · {formatDateTime(ticket.created_at)}
          </Text>
          <Text className="text-text mt-1 text-sm">{ticket.message}</Text>
        </Card>

        {ticket.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        <View className="gap-2 pt-2">
          <TextField
            label="Agregar mensaje"
            placeholder="Más contexto, o preguntá si no tuviste respuesta todavía"
            value={draft}
            onChangeText={setDraft}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {error ? <Text className="text-expense text-xs">{error}</Text> : null}
          <Button
            label="Mandar"
            loading={reply.isPending}
            disabled={!draft.trim()}
            onPress={onReply}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
