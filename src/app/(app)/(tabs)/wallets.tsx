import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useNetWorth, useReorderWallets, useWallets } from '@/api/queries';
import { NetWorthPager } from '@/components/NetWorthPager';
import { SectionHeader } from '@/components/SectionHeader';
import { WalletRow } from '@/components/WalletRow';
import { Card } from '@/components/ui/Card';
import { DragList } from '@/components/ui/DragList';
import { Icon } from '@/components/ui/Icon';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useColors } from '@/theme';
import { flattenTree } from '@/lib/wallets';
import { useWorkspaceStore } from '@/store/workspace';

type NetFilter = 'all' | 'net' | 'excluded';

export default function WalletsScreen() {
  const colors = useColors();
  const netWorth = useNetWorth();
  const wallets = useWallets();
  const reorder = useReorderWallets();
  const [reordering, setReordering] = useState(false);
  const [netFilter, setNetFilter] = useState<NetFilter>('all');

  // La del workspace, no la de "la primera cartera" -- es la que ya viene
  // convertido `netWorth.data.net` (ver Workspace.base_currency).
  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';
  const allNodes = useMemo(() => flattenTree(wallets.data ?? []), [wallets.data]);
  const nodes = useMemo(() => {
    if (netFilter === 'all') return allNodes;
    const wantsNet = netFilter === 'net';
    return allNodes.filter((n) => n.wallet.counts_toward_net_worth === wantsNet);
  }, [allNodes, netFilter]);
  const loading = netWorth.isLoading || wallets.isLoading;
  const refreshing = (netWorth.isFetching || wallets.isFetching) && !loading;
  const refresh = usePullRefresh(refreshing, () => {
    netWorth.refetch();
    wallets.refetch();
  });

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        title="Carteras"
        right={
          <View className="flex-row gap-2">
            {allNodes.length > 1 ? (
              <Pressable
                onPress={() => setReordering((r) => !r)}
                className="rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-text text-sm font-semibold">
                  {reordering ? 'Listo' : 'Ordenar'}
                </Text>
              </Pressable>
            ) : null}
            {!reordering ? (
              <Pressable
                onPress={() => router.push('/wallet/new')}
                className="h-8 w-8 items-center justify-center rounded-full bg-primary active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Nueva cartera"
              >
                <Icon name="plus" size={16} color={colors.primaryFg} />
              </Pressable>
            ) : null}
          </View>
        }
      />

      <ScrollView
        contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-4"
        refreshControl={refresh}
      >
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

            {!reordering && allNodes.length > 0 ? (
              <Segmented
                value={netFilter}
                onChange={setNetFilter}
                options={[
                  { value: 'all', label: 'Todas' },
                  { value: 'net', label: 'Cuentan al neto' },
                  { value: 'excluded', label: 'Fuera del neto' },
                ]}
              />
            ) : null}

            {reordering ? (
              <Card title="Orden de carteras">
                <DragList
                  data={allNodes}
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
            ) : nodes.length === 0 ? (
              <EmptyState
                title={netFilter === 'all' ? 'Sin carteras' : 'Nada con este filtro'}
                hint={
                  netFilter === 'all'
                    ? 'Crea una con el botón de arriba.'
                    : 'Cambia el filtro para ver el resto de tus carteras.'
                }
              />
            ) : (
              <View className="gap-3">
                {nodes.map((node) => (
                  <View key={node.wallet.id} className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => router.push(`/wallet-transactions?wallet=${node.wallet.id}`)}
                      className="flex-1 active:opacity-70"
                      accessibilityRole="button"
                    >
                      <WalletRow
                        wallet={node.wallet}
                        hasChildren={node.hasChildren}
                        depth={node.depth}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => router.push(`/wallet/${node.wallet.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${node.wallet.name}`}
                      className="h-8 w-8 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
                    >
                      <Icon name="pencil" size={13} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
