import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useUnarchiveWallet, useWallets } from '@/api/queries';
import type { Wallet } from '@/api/types';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { walletColor } from '@/lib/wallets';
import { haptics } from '@/lib/haptics';
import { useSnackbarStore } from '@/store/snackbar';
import { fonts } from '@/theme/typography';

/**
 * Carteras archivadas (`is_archived=true`): desaparecen de la lista principal
 * de "Carteras" y de los selectores al agregar transacciones (ver
 * `WalletViewSet.get_queryset` en el backend, que filtra `is_archived=False`
 * salvo que se pida explícitamente), pero siguen contando para el patrimonio
 * neto. Sin esta pantalla no había forma de volver a encontrar una una vez
 * archivada salvo tener guardado el link directo a su edición.
 */
export default function HiddenWalletsScreen() {
  const q = useWallets({ is_archived: true });
  const unarchive = useUnarchiveWallet();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const items = q.data ?? [];
  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());
  // Cuál fila está desarchivando: `unarchive.isPending` solo no alcanza,
  // es compartido por la mutación entera y prendería el loading en todas
  // las filas a la vez si se tocan dos seguidas.
  const [unhidingId, setUnhidingId] = useState<string | null>(null);

  async function onUnhide(wallet: Wallet) {
    haptics.tap();
    setUnhidingId(wallet.id);
    try {
      await unarchive.mutateAsync(wallet.id);
      showSnackbar({ message: `«${wallet.name}» ya está visible de nuevo` });
    } catch (err) {
      showSnackbar({ message: errorMessage(err, 'No se pudo mostrar la cartera.') });
    } finally {
      setUnhidingId(null);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Cuentas ocultas" />
      <Text className="text-text-muted text-sm">
        Carteras que archivaste: no aparecen en la lista principal ni al elegir cartera en una
        transacción, pero siguen contando para el patrimonio neto.
      </Text>

      <ScrollView contentContainerClassName="gap-3 py-2" refreshControl={refresh}>
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No tenés cuentas ocultas"
            hint="Archivá una cartera desde su edición para que deje de aparecer acá."
          />
        ) : (
          <Card>
            {items.map((wallet, i) => (
              <View
                key={wallet.id}
                className={`flex-row items-center gap-3 py-3 ${
                  i === 0 ? '' : 'border-t border-border/30'
                }`}
              >
                <View
                  className="h-8 w-1.5 rounded-full"
                  style={{ backgroundColor: walletColor(wallet) }}
                />
                <Text
                  className="text-text flex-1 text-base"
                  style={{ fontFamily: fonts.semibold }}
                  numberOfLines={1}
                >
                  {wallet.name}
                </Text>
                <Button
                  label="Mostrar"
                  variant="ghost"
                  loading={unhidingId === wallet.id}
                  disabled={unarchive.isPending}
                  onPress={() => onUnhide(wallet)}
                />
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
