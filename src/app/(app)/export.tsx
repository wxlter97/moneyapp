import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

import { useTransactions } from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import { Button } from '@/components/ui/Button';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { downloadTextFile, transactionsToCsv } from '@/lib/export';
import { todayISO } from '@/lib/date';

export default function ExportScreen() {
  const txQuery = useTransactions();
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();
  const [done, setDone] = useState<string | null>(null);

  const items = txQuery.data ?? [];

  function onDownload() {
    const csv = transactionsToCsv(items, categories, wallets);
    const name = `budget-transacciones-${todayISO()}.csv`;
    const ok = downloadTextFile(name, csv);
    setDone(ok ? name : 'error');
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Exportar datos" />
      <ScrollView contentContainerClassName="gap-4 py-3">
        {txQuery.isLoading ? (
          <LoadingState />
        ) : txQuery.isError ? (
          <ErrorState error={txQuery.error} onRetry={txQuery.refetch} />
        ) : (
          <>
            <Text className="text-text-muted text-sm">
              Descarga todas tus transacciones ({items.length}) en un archivo CSV, con
              fecha, tipo, categoría, cartera, monto y nota.
            </Text>

            {Platform.OS !== 'web' ? (
              <Text className="text-warning text-sm">
                La descarga de archivos solo está disponible en la versión web.
              </Text>
            ) : (
              <Button
                label={`Descargar CSV (${items.length})`}
                disabled={items.length === 0}
                onPress={onDownload}
              />
            )}

            {done && done !== 'error' ? (
              <Text className="text-income text-sm">Descargado: {done}</Text>
            ) : null}
            {done === 'error' ? (
              <Text className="text-expense text-sm">No se pudo generar la descarga.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
