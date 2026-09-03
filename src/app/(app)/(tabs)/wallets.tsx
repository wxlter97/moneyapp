import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useNetWorth, useWallets } from '@/api/queries';
import { NetWorthPager } from '@/components/NetWorthPager';
import { SectionHeader } from '@/components/SectionHeader';
import { WalletRow } from '@/components/WalletRow';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { flattenTree } from '@/lib/wallets';

export default function WalletsScreen() {
  const netWorth = useNetWorth();
  const wallets = useWallets();

  const currency = wallets.data?.[0]?.currency ?? 'USD';
  const nodes = useMemo(() => flattenTree(wallets.data ?? []), [wallets.data]);
  const loading = netWorth.isLoading || wallets.isLoading;

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        section="wallets"
        title="Carteras"
        right={
          <Pressable
            onPress={() => router.push('/wallet/new')}
            className="rounded-lg bg-white/20 px-3 py-1.5 active:opacity-70"
            accessibilityRole="button"
          >
            <Text className="text-sm font-semibold text-white">+ Nueva</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerClassName="px-4 pb-28 pt-4 self-center w-full max-w-[560px] gap-4">
        {loading ? (
          <LoadingState />
        ) : netWorth.isError || wallets.isError || !netWorth.data ? (
          <ErrorState
            error={netWorth.error ?? wallets.error}
            onRetry={() => {
              netWorth.refetch();
              wallets.refetch();
            }}
          />
        ) : (
          <>
            <NetWorthPager data={netWorth.data} currency={currency} />

            {nodes.length === 0 ? (
              <EmptyState title="Sin carteras" hint="Crea una con el botón de arriba." />
            ) : (
              <Card title="Todas las carteras">
                {nodes.map((node, i) => (
                  <View key={node.wallet.id}>
                    {i > 0 ? <View className="h-px bg-border/60" /> : null}
                    <Pressable
                      onPress={() => router.push(`/wallet/${node.wallet.id}`)}
                      className="active:opacity-60"
                      accessibilityRole="button"
                    >
                      <WalletRow
                        wallet={node.wallet}
                        hasChildren={node.hasChildren}
                        depth={node.depth}
                      />
                    </Pressable>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
