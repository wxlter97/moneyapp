import { ScrollView, Text, View } from 'react-native';

import { useAccounts, useAssets, useDebts, useLiabilities, useNetWorth } from '@/api/queries';
import { AccountRow } from '@/components/AccountRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

export default function AccountsScreen() {
  const netWorth = useNetWorth();
  const accounts = useAccounts();
  const assets = useAssets();
  const liabilities = useLiabilities();
  const debts = useDebts();

  const currency = accounts.data?.[0]?.currency ?? 'USD';
  const debtsFavor = (debts.data ?? []).filter((d) => d.direction === 'a_favor');
  const debtsContra = (debts.data ?? []).filter((d) => d.direction === 'en_contra');

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="px-4 pb-24 self-center w-full max-w-[560px] gap-4">
        <ScreenHeader />

        {/* Desglose de patrimonio neto */}
        <Card title="Patrimonio neto">
          {netWorth.isLoading ? (
            <LoadingState />
          ) : netWorth.isError || !netWorth.data ? (
            <ErrorState error={netWorth.error} onRetry={netWorth.refetch} />
          ) : (
            <View className="gap-2">
              <Money
                value={netWorth.data.net}
                currency={currency}
                signed
                className="text-3xl font-bold"
              />
              <View className="mt-1 gap-1.5">
                <BreakdownLine label="Cuentas" value={netWorth.data.accounts} currency={currency} sign="+" />
                <BreakdownLine label="Activos" value={netWorth.data.assets} currency={currency} sign="+" />
                <BreakdownLine
                  label="Deudas a favor"
                  value={netWorth.data.debts_owed_to_us}
                  currency={currency}
                  sign="+"
                />
                <BreakdownLine
                  label="Pasivos"
                  value={netWorth.data.liabilities}
                  currency={currency}
                  sign="−"
                />
                <BreakdownLine
                  label="Deudas en contra"
                  value={netWorth.data.debts_we_owe}
                  currency={currency}
                  sign="−"
                />
              </View>
            </View>
          )}
        </Card>

        <Section title="Cuentas" query={accounts} empty="Sin cuentas">
          {accounts.data?.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider /> : null}
              <AccountRow account={a} />
            </View>
          ))}
        </Section>

        <Section title="Activos" query={assets} empty="Sin activos">
          {assets.data?.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider /> : null}
              <SimpleRow
                title={a.name}
                subtitle={a.type + (a.visibility === 'private' ? ' · privado' : '')}
                value={<Money value={a.current_value} currency={currency} />}
              />
            </View>
          ))}
        </Section>

        <Section title="Pasivos" query={liabilities} empty="Sin pasivos">
          {liabilities.data?.map((l, i) => (
            <View key={l.id}>
              {i > 0 ? <Divider /> : null}
              <SimpleRow
                title={l.name}
                subtitle={`${l.type} · de ${formatTotal(l.total_amount, currency)}`}
                value={<Money value={l.remaining_amount} currency={currency} tone="expense" />}
              />
            </View>
          ))}
        </Section>

        <Section
          title="Deudas"
          query={debts}
          empty="Sin deudas registradas"
        >
          {debtsFavor.length > 0 ? (
            <Text className="pb-1 pt-1 text-text-muted text-[11px] uppercase tracking-wide">
              A favor
            </Text>
          ) : null}
          {debtsFavor.map((d, i) => (
            <View key={d.id}>
              {i > 0 ? <Divider /> : null}
              <SimpleRow
                title={d.person}
                subtitle={d.description || undefined}
                value={<Money value={d.amount} currency={currency} tone="income" />}
              />
            </View>
          ))}
          {debtsContra.length > 0 ? (
            <Text className="pb-1 pt-3 text-text-muted text-[11px] uppercase tracking-wide">
              En contra
            </Text>
          ) : null}
          {debtsContra.map((d, i) => (
            <View key={d.id}>
              {i > 0 ? <Divider /> : null}
              <SimpleRow
                title={d.person}
                subtitle={d.description || undefined}
                value={<Money value={d.amount} currency={currency} tone="expense" />}
              />
            </View>
          ))}
        </Section>
      </ScrollView>
    </View>
  );
}

function formatTotal(v: string, currency: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number(v) || 0);
}

function Divider() {
  return <View className="h-px bg-border/60" />;
}

function BreakdownLine({
  label,
  value,
  currency,
  sign,
}: {
  label: string;
  value: string;
  currency: string;
  sign: '+' | '−';
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-text-muted text-sm">
        {sign} {label}
      </Text>
      <Money value={value} currency={currency} tone="muted" className="text-sm" />
    </View>
  );
}

function SimpleRow({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle?: string;
  value: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-3">
        <Text className="text-text text-base" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-text-muted text-xs" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value}
    </View>
  );
}

interface SectionProps {
  title: string;
  empty: string;
  query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => void; data?: unknown[] };
  children: React.ReactNode;
}

function Section({ title, empty, query, children }: SectionProps) {
  return (
    <Card title={title}>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState title={empty} />
      ) : (
        children
      )}
    </Card>
  );
}
