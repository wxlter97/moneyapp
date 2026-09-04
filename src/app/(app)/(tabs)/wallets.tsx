import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useNetWorth, useReorderWallets, useWallets } from '@/api/queries';
import { NetWorthPager } from '@/components/NetWorthPager';
import { SectionHeader } from '@/components/SectionHeader';
import { WalletRow } from '@/components/WalletRow';
import { Card } from '@/components/ui/Card';
import { DragList } from '@/components/ui/DragList';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { flattenTree } from '@/lib/wallets';

export default function WalletsScreen() {
  const netWorth = useNetWorth();
  const wallets = useWallets();
  const reorder = useReorderWallets();
  const [reordering, setReordering] = useState(false);

  const currency = wallets.data?.[0]?.currency ?? 'USD';
  const nodes = useMemo(() => flattenTree(wallets.data ?? []), [wallets.data]);
  const loading = netWorth.isLoading || wallets.isLoading;

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        section="wallets"
        title="Carteras"
        right={
          <View className="flex-row gap-2">
            {nodes.length > 1 ? (
              <Pressable
                onPress={() => setReordering((r) => !r)}
                className="rounded-lg bg-white/20 px-3 py-1.5 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-sm font-semibold text-white">
                  {reordering ? 'Listo' : 'Ordenar'}
                </Text>
              </Pressable>
            ) : null}
            {!reordering ? (
              <Pressable
                onPress={() => router.push('/wallet/new')}
                className="rounded-lg bg-white/20 px-3 py-1.5 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-sm font-semibold text-white">+ Nueva</Text>
              </Pressable>
            ) : null}
          </View>
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
            {!reordering ? <NetWorthPager data={netWorth.data} currency={currency} /> : null}

            {nodes.length === 0 ? (
              <EmptyState title="Sin carteras" hint="Crea una con el botón de arriba." />
            ) : reordering ? (
              <Card title="Orden de carteras">
                <DragList
                  data={nodes}
                  keyExtractor={(node) => node.wallet.id}
                  itemHeight={44}
                  onReorder={(keys) => reorder.mutate(keys)}
                  renderItem={(node) => (
                    <Text className="text-text py-3 text-base" numberOfLines={1}>
                      {node.wallet.name}
                    </Text>
                  )}
                />
              </Card>
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
