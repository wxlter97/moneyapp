import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useHasFeature, useNetWorth, useReorderWallets, useWallets } from '@/api/queries';
import { NetWorthPager } from '@/components/NetWorthPager';
import { SectionHeader } from '@/components/SectionHeader';
import { WalletRow, walletRowLabel } from '@/components/WalletRow';
import { Card } from '@/components/ui/Card';
import { DragList } from '@/components/ui/DragList';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { notifyError } from '@/lib/notifyError';
import { useColors } from '@/theme';
import { flattenTree } from '@/lib/wallets';
import { useDesktopContentWidth } from '@/lib/responsive';
import { useWorkspaceStore } from '@/store/workspace';

const DESKTOP_MAX_WIDTH = 720;

type NetFilter = 'all' | 'net' | 'excluded';

export default function WalletsScreen() {
  const colors = useColors();
  // A diferencia de Presupuesto (grupos independientes, ver budgets.tsx),
  // acá NO se pasa a 2 columnas: la lista tiene jerarquía padre/hijo
  // (`node.depth`/`hasChildren`) y partirla a la mitad separaría una
  // cartera de sus sub-carteras en columnas distintas. Se ensancha nomás
  // el contenido -- ya reduce el espacio vacío sin arriesgar esa relación
  // visual; una grilla de verdad acá necesita agrupar por cartera raíz
  // primero, que es un rediseño propio, no este ajuste. `useDesktopContentWidth`
  // (no un booleano) porque el ancho fijo simple invadía el margen de
  // `SideNav` a anchos de escritorio "justos" -- ver el mismo fix en
  // budgets.tsx.
  const contentWidth = useDesktopContentWidth(DESKTOP_MAX_WIDTH);
  // "patrimonio" es del gratis restrictivo (22-sep-2026, ver
  // ECONOMIA-POR-PLAN.md) -- pero la LISTA de carteras (lo que esta
  // pantalla es, ante todo) no: `netWorth` sólo alimenta el pager de
  // arriba, así que sin la feature ni se pide (ver `enabled` abajo) y el
  // resto de la pantalla no depende de que resuelva.
  const canSeeNetWorth = useHasFeature('net_worth');
  const netWorth = useNetWorth({ enabled: canSeeNetWorth !== false });
  const wallets = useWallets();
  // Sólo para saber si mostrar el acceso a las ocultas (antes únicamente en
  // Herramientas → Datos, lejos de donde uno las busca).
  const archived = useWallets({ is_archived: true });
  const archivedCount = archived.data?.length ?? 0;
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
  const loading = (canSeeNetWorth !== false && netWorth.isLoading) || wallets.isLoading;
  const refreshing = ((canSeeNetWorth !== false && netWorth.isFetching) || wallets.isFetching) && !loading;
  const refresh = usePullRefresh(refreshing, () => {
    if (canSeeNetWorth !== false) netWorth.refetch();
    wallets.refetch();
  });

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        title="Carteras"
        maxWidth={contentWidth}
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
              <IconButton
                icon="plus"
                size={32}
                iconSize={16}
                color={colors.primaryFg}
                onPress={() => router.push('/wallet/new')}
                accessibilityLabel="Nueva cartera"
                className="rounded-full bg-primary active:opacity-80"
              />
            ) : null}
          </View>
        }
      />

      <ScrollView
        contentContainerClassName="px-4 pb-36 pt-4 self-center w-full gap-4"
        contentContainerStyle={{ maxWidth: contentWidth }}
        refreshControl={refresh}
      >
        {loading ? (
          <LoadingState />
        ) : wallets.isError || (canSeeNetWorth !== false && (netWorth.isError || !netWorth.data)) ? (
          <ErrorState
            error={netWorth.error ?? wallets.error}
            onRetry={() => {
              if (canSeeNetWorth !== false) netWorth.refetch();
              wallets.refetch();
            }}
          />
        ) : (
          <>
            {!reordering && canSeeNetWorth === false ? (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  router.push('/pro');
                }}
                className="flex-row items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 active:opacity-70"
                accessibilityRole="button"
              >
                <Icon name="star" size={16} color={colors.textMuted} />
                <Text className="text-text-muted flex-1 text-sm">
                  Patrimonio neto -- pasate a Plus para verlo
                </Text>
              </Pressable>
            ) : !reordering && netWorth.data ? (
              <NetWorthPager data={netWorth.data} currency={currency} maxWidth={contentWidth} />
            ) : null}

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
                  onReorder={(keys) =>
                    reorder.mutate(keys, {
                      onError: (err) => notifyError(err, 'No se pudo guardar el orden.'),
                    })
                  }
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
                  <Pressable
                    key={node.wallet.id}
                    onPress={() => router.push(`/wallet-transactions?wallet=${node.wallet.id}`)}
                    className="active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel={walletRowLabel(node.wallet, node.hasChildren)}
                  >
                    <WalletRow
                      wallet={node.wallet}
                      hasChildren={node.hasChildren}
                      depth={node.depth}
                    />
                  </Pressable>
                ))}
              </View>
            )}

            {!reordering && archivedCount > 0 ? (
              <Pressable
                onPress={() => router.push('/hidden-wallets')}
                className="items-center py-2 active:opacity-60"
                accessibilityRole="button"
              >
                <Text className="text-text-muted text-sm">
                  {archivedCount === 1 ? '1 cartera oculta' : `${archivedCount} carteras ocultas`} · Ver
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
