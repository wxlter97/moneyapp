import { ScrollView, Text, View } from 'react-native';

import { useGamificationSummary } from '@/api/queries';
import type { BadgeStatus } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

// El backend manda un ícono descriptivo por badge (texto libre, no un
// `IconName`) -- se traduce acá; cualquiera no mapeado cae en 'bolt'.
const BADGE_ICON: Record<string, IconName> = {
  flame: 'bolt',
  calendar: 'calendar',
  trending: 'trending',
};

/**
 * Racha de días sin gasto fuera de presupuesto, fines de semana sin gastos,
 * % de ahorro del mes en curso, y el catálogo completo de badges con su
 * estado -- ver `GET gamification/summary/`.
 */
export default function AchievementsScreen() {
  const summary = useGamificationSummary();
  const refresh = usePullRefresh(summary.isFetching && !summary.isLoading, summary.refetch);

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Logros" />
      <ScrollView contentContainerClassName="gap-3 py-2" refreshControl={refresh}>
        {summary.isLoading ? (
          <LoadingState />
        ) : summary.isError ? (
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        ) : summary.data ? (
          <>
            <View className="-m-1.5 flex-row flex-wrap">
              <StatTile
                icon="bolt"
                label="Racha actual"
                value={`${summary.data.current_streak} ${summary.data.current_streak === 1 ? 'día' : 'días'}`}
              />
              <StatTile
                icon="trending"
                label="Mejor racha"
                value={`${summary.data.longest_streak} ${summary.data.longest_streak === 1 ? 'día' : 'días'}`}
              />
              <StatTile
                icon="calendar"
                label="Finde sin gastos"
                value={String(summary.data.no_spend_weekends)}
              />
              <StatTile
                icon="card"
                label="Ahorro este mes"
                value={summary.data.monthly_savings_pct != null ? `${summary.data.monthly_savings_pct}%` : '—'}
              />
            </View>

            <Card title="Badges">
              {summary.data.badges.length === 0 ? (
                <EmptyState title="Todavía no hay badges" hint="Volvé a revisar más adelante." />
              ) : (
                <View>
                  {summary.data.badges.map((badge, i) => (
                    <BadgeRow key={badge.code} badge={badge} isFirst={i === 0} />
                  ))}
                </View>
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function StatTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const colors = useColors();
  return (
    <View className="w-1/2 p-1.5">
      <View className="gap-1 rounded-3xl bg-surface-2 p-3.5">
        <Icon name={icon} size={15} color={colors.textMuted} />
        <Text className="text-text-muted mt-1 text-[11px] uppercase tracking-wide">{label}</Text>
        <Text className="text-text text-lg" style={{ fontFamily: fonts.semibold }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function BadgeRow({ badge, isFirst }: { badge: BadgeStatus; isFirst: boolean }) {
  const colors = useColors();
  return (
    <View
      className={`flex-row items-center gap-3 py-2.5 ${isFirst ? '' : 'border-t border-border/30'} ${badge.earned ? '' : 'opacity-40'}`}
    >
      <View className="bg-surface h-9 w-9 items-center justify-center rounded-full">
        <Icon name={BADGE_ICON[badge.icon] ?? 'bolt'} size={16} color={badge.earned ? colors.warning : colors.textMuted} />
      </View>
      <View className="flex-1">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          {badge.name}
        </Text>
        <Text className="text-text-muted text-xs">{badge.description}</Text>
      </View>
      {badge.earned ? <Icon name="check" size={16} color={colors.income} /> : null}
    </View>
  );
}
