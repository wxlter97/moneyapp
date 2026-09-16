import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useSupportTickets } from '@/api/queries';
import type { SupportTicket, SupportTicketStatus, SupportTicketType } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
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

/**
 * Mis reportes de error, consultas y sugerencias -- se mandan acá, se
 * reenvían a soporte, y la respuesta (si la hay) aparece en el hilo de cada
 * uno (ver `support-ticket.tsx`).
 */
export default function SupportScreen() {
  const colors = useColors();
  const q = useSupportTickets();
  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());
  const tickets = q.data ?? [];

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Soporte" />
      <Pressable
        onPress={() => {
          haptics.tap();
          router.push('/support-new');
        }}
        className="flex-row items-center gap-1 self-end rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
        accessibilityRole="button"
      >
        <Icon name="plus" size={13} color={colors.primary} />
        <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
          Nuevo
        </Text>
      </Pressable>

      <ScrollView contentContainerClassName="gap-3 py-2" refreshControl={refresh}>
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : tickets.length === 0 ? (
          <EmptyState
            title="Sin reportes todavía"
            hint="¿Encontraste un error, tenés una consulta o una idea? Contanos acá."
          />
        ) : (
          <Card>
            {tickets.map((ticket, i) => (
              <TicketRow key={ticket.id} ticket={ticket} first={i === 0} colors={colors} />
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function TicketRow({
  ticket,
  first,
  colors,
}: {
  ticket: SupportTicket;
  first: boolean;
  colors: { textMuted: string };
}) {
  const hasStaffReply = ticket.messages.some((m) => m.is_staff_reply);
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        router.push(`/support-ticket?id=${ticket.id}`);
      }}
      accessibilityRole="button"
      className={`flex-row items-center gap-2 py-3 active:opacity-60 ${first ? '' : 'border-t border-border/30'}`}
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-text flex-1 text-sm" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
            {ticket.subject}
          </Text>
          {hasStaffReply ? <Icon name="check" size={12} color={colors.textMuted} /> : null}
        </View>
        <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={1}>
          {TYPE_LABEL[ticket.type]} · {STATUS_LABEL[ticket.status]} · {formatDateTime(ticket.created_at)}
        </Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.textMuted} />
    </Pressable>
  );
}
