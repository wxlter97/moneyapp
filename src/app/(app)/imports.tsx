import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useEmailImportLogs, useRejectEmailImport } from '@/api/queries';
import type { EmailImportLog, EmailImportStatus } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatShortDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const STATUS_LABEL: Record<EmailImportStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  failed: 'No reconocida',
};

/**
 * Bandeja de revisión de correos bancarios: el pipeline de ingestión ya deja
 * cada correo parseado como candidata (`EmailImportLog`); acá se aprueba
 * (crea la Transaction) o se descarta. Por defecto solo pendientes; "Ver
 * todo" destapa el historial completo (solo lectura).
 */
export default function ImportsScreen() {
  const [showAll, setShowAll] = useState(false);
  const q = useEmailImportLogs(showAll ? undefined : 'pending');
  const reject = useRejectEmailImport();
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const items = q.data ?? [];
  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());

  async function onReject(id: string) {
    try {
      await reject.mutateAsync(id);
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setRejectingId(null);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Importaciones" />

      <Pressable
        onPress={() => {
          haptics.tap();
          setShowAll((v) => !v);
        }}
        className="self-end py-1 active:opacity-60"
        accessibilityRole="button"
      >
        <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
          {showAll ? 'Solo pendientes' : 'Ver historial'}
        </Text>
      </Pressable>

      <ScrollView
        contentContainerClassName="gap-3 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title={showAll ? 'Sin importaciones' : 'Bandeja vacía'}
            hint={
              showAll
                ? 'Todavía no llegó ningún correo bancario.'
                : 'No hay correos bancarios esperando revisión.'
            }
          />
        ) : (
          items.map((log) => (
            <ImportCard
              key={log.id}
              log={log}
              confirming={rejectingId === log.id}
              onAskReject={() => setRejectingId(log.id)}
              onCancelReject={() => setRejectingId(null)}
              onReject={() => onReject(log.id)}
              rejecting={reject.isPending && rejectingId === log.id}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function ImportCard({
  log,
  confirming,
  onAskReject,
  onCancelReject,
  onReject,
  rejecting,
}: {
  log: EmailImportLog;
  confirming: boolean;
  onAskReject: () => void;
  onCancelReject: () => void;
  onReject: () => void;
  rejecting: boolean;
}) {
  const colors = useColors();
  const isPending = log.status === 'pending';

  return (
    <Card>
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
          <Icon name="inbox" size={16} color={colors.textMuted} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
            {log.extracted_merchant || log.bank_name || 'Correo bancario'}
          </Text>
          <Text className="text-text-muted text-xs" numberOfLines={1}>
            {log.bank_name ?? 'Banco no identificado'}
            {log.extracted_date ? ` · ${formatShortDate(log.extracted_date)}` : ''}
          </Text>
          {log.raw_email_subject ? (
            <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={1}>
              {log.raw_email_subject}
            </Text>
          ) : null}
          {log.status === 'failed' && log.error_message ? (
            <Text className="text-expense mt-1 text-xs">{log.error_message}</Text>
          ) : null}
        </View>
        <View className="items-end gap-1">
          {log.extracted_amount ? (
            <Money value={log.extracted_amount} currency="USD" className="text-sm font-semibold" />
          ) : null}
          {!isPending ? (
            <View className="rounded-full bg-surface-2 px-2 py-0.5">
              <Text className="text-text-muted text-[10px] uppercase tracking-wide">
                {STATUS_LABEL[log.status]}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {isPending ? (
        confirming ? (
          <View className="mt-3 gap-2 rounded-2xl bg-expense/10 p-3">
            <Text className="text-text text-sm">¿Descartar esta candidata?</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Cancelar" variant="ghost" onPress={onCancelReject} />
              </View>
              <View className="flex-1">
                <Button label="Rechazar" loading={rejecting} onPress={onReject} />
              </View>
            </View>
          </View>
        ) : (
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button label="Rechazar" variant="ghost" onPress={onAskReject} />
            </View>
            <View className="flex-1">
              <Button
                label="Confirmar"
                onPress={() => {
                  haptics.tap();
                  router.push(`/import/${log.id}`);
                }}
              />
            </View>
          </View>
        )
      ) : null}
    </Card>
  );
}
