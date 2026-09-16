import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { useCreateSupportTicket } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { SupportTicketType } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { TextField } from '@/components/ui/TextField';
import { haptics } from '@/lib/haptics';

const TYPE_OPTIONS: { value: SupportTicketType; label: string }[] = [
  { value: 'bug', label: 'Error' },
  { value: 'query', label: 'Consulta' },
  { value: 'suggestion', label: 'Sugerencia' },
];

/** Nuevo reporte de error, consulta o sugerencia -- ver `support.tsx` para
 * el historial y `support-ticket.tsx` para el hilo de cada uno. */
export default function SupportNewScreen() {
  const create = useCreateSupportTicket();

  const [type, setType] = useState<SupportTicketType>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !create.isPending;

  async function onSubmit() {
    if (!canSubmit) return;
    setError(null);
    try {
      const ticket = await create.mutateAsync({
        type,
        subject: subject.trim(),
        message: message.trim(),
        app_version: Constants.expoConfig?.version ?? undefined,
        platform: Platform.OS,
      });
      haptics.success();
      router.replace(`/support-ticket?id=${ticket.id}`);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo mandar el reporte.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']} variant="drawer">
      <ModalHeader title="Nuevo reporte" />
      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        <View className="gap-1.5">
          <Text className="text-text-muted text-sm">Tipo</Text>
          <Segmented value={type} onChange={setType} options={TYPE_OPTIONS} />
        </View>

        <TextField
          label="Asunto"
          placeholder="Un resumen corto"
          value={subject}
          onChangeText={setSubject}
          maxLength={200}
        />

        <TextField
          label="Mensaje"
          placeholder={
            type === 'bug'
              ? 'Qué esperabas que pasara, qué pasó en realidad, y cómo reproducirlo.'
              : 'Contanos con el mayor detalle posible.'
          }
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text className="text-text-muted text-xs">
          Mandamos junto con esto la versión de la app y la plataforma, para ayudar a diagnosticarlo.
        </Text>

        {error ? <Text className="text-expense text-sm">{error}</Text> : null}

        <Button label="Mandar" loading={create.isPending} disabled={!canSubmit} onPress={onSubmit} />
      </ScrollView>
    </Screen>
  );
}
