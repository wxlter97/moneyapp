import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useCreditCardStatements } from '@/api/queries';
import type { CreditCardStatementSummary } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatShortDate } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * "Cuánto debo en mis tarjetas" -- resumen de todas las tarjetas de crédito
 * con fecha de corte configurada (Fase 3 del roadmap). El detalle de cada
 * una, con selector de fecha, vive en `/statement/[id]`.
 */
export default function StatementsScreen() {
  const q = useCreditCardStatements();
  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());
  const cards = q.data ?? [];

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Estado de cuenta" />
      <ScrollView
        contentContainerClassName="gap-3 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : cards.length === 0 ? (
          <EmptyState
            title="Sin tarjetas de crédito"
            hint="Agrega el día de corte en una tarjeta (Herramientas → esa cartera) para ver aquí cuánto debes."
          />
        ) : (
          <Card>
            {cards.map((c, i) => (
              <StatementRow key={c.wallet_id} statement={c} first={i === 0} />
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatementRow({
  statement: s,
  first,
}: {
  statement: CreditCardStatementSummary;
  first: boolean;
}) {
  const colors = useColors();
  const due = toNumber(s.total_due);
  const upToDate = due <= 0.005;

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        router.push(`/statement/${s.wallet_id}`);
      }}
      className={`flex-row items-center gap-3 py-3 active:opacity-60 ${
        first ? '' : 'border-t border-border/30'
      }`}
      accessibilityRole="button"
    >
      <View className="bg-surface-2 h-10 w-10 items-center justify-center rounded-full">
        <Icon name="card" size={18} color={colors.text} />
      </View>
      <View className="flex-1">
        <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {s.wallet_name}
          {s.card_last4 ? <Text className="text-text-muted"> ···· {s.card_last4}</Text> : null}
        </Text>
        <Text className="text-text-muted text-xs" numberOfLines={1}>
          Corte {formatShortDate(s.cutoff_date)}
          {s.payment_due_date ? ` · vence ${formatShortDate(s.payment_due_date)}` : ''}
        </Text>
      </View>
      <View className="items-end">
        {upToDate ? (
          <Text className="text-income text-sm" style={{ fontFamily: fonts.semibold }}>
            Al día
          </Text>
        ) : (
          <Money value={due} currency={s.currency} tone="expense" className="text-sm font-semibold" />
        )}
        {s.available != null ? (
          <Text className="text-text-muted text-[11px]">
            <Money value={s.available} currency={s.currency} tone="muted" /> disponible
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
