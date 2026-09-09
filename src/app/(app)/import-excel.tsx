import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

import { useImportTemplate, useImportTransactionsXlsx } from '@/api/queries';
import type { TransactionImportResult } from '@/api/types';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { haptics } from '@/lib/haptics';
import { downloadBinaryFile, pickFile } from '@/lib/export';
import { fonts } from '@/theme/typography';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Carga masiva de transacciones vía plantilla de Excel: descargarla (con las
 * carteras/categorías reales de este presupuesto ya cargadas como
 * referencia) y subirla llena de vuelta. Las dos puntas del mismo flujo
 * viven en una sola pantalla -- no tendría sentido separarlas en dos
 * herramientas distintas.
 */
export default function ImportExcelScreen() {
  const template = useImportTemplate();
  const importXlsx = useImportTransactionsXlsx();

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadedAs, setDownloadedAs] = useState<string | null>(null);

  const [picked, setPicked] = useState<File | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function onDownloadTemplate() {
    setDownloadError(null);
    setDownloadedAs(null);
    try {
      const bytes = await template.mutateAsync();
      const name = 'plantilla-transacciones.xlsx';
      const ok = downloadBinaryFile(name, bytes, XLSX_MIME);
      if (ok) {
        setDownloadedAs(name);
        haptics.success();
      } else {
        setDownloadError('La descarga solo está disponible en la versión web.');
      }
    } catch (err) {
      setDownloadError(errorMessage(err, 'No se pudo generar la plantilla.'));
    }
  }

  async function onPickFile() {
    setPickError(null);
    setPicked(null);
    setResult(null);
    setImportError(null);
    const file = await pickFile('.xlsx');
    if (file === null) {
      if (Platform.OS !== 'web') {
        setPickError('Importar desde un archivo solo está disponible en la versión web.');
      }
      return;
    }
    setPicked(file);
    haptics.tap();
  }

  async function onImport() {
    if (!picked) return;
    setImportError(null);
    try {
      const data = await importXlsx.mutateAsync(picked);
      setResult(data);
      if (data.errors.length === 0) haptics.success();
      else haptics.warning();
    } catch (err) {
      haptics.error();
      setImportError(errorMessage(err, 'No se pudo importar el archivo.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Importar desde Excel" />
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        <Card title="1. Descargar la plantilla">
          <Text className="text-text-muted text-sm">
            Un archivo .xlsx con las columnas listas para llenar, más las carteras y
            categorías de este presupuesto (para que sepas qué nombres escribir). Trae 3
            filas de ejemplo -- bórralas antes de importar.
          </Text>

          {Platform.OS !== 'web' ? (
            <Text className="text-warning mt-3 text-sm">
              La descarga de archivos solo está disponible en la versión web.
            </Text>
          ) : (
            <View className="mt-3">
              <Button
                label="Descargar plantilla (.xlsx)"
                variant="ghost"
                loading={template.isPending}
                onPress={onDownloadTemplate}
              />
            </View>
          )}

          {downloadedAs ? (
            <Text className="text-income mt-2 text-sm">Descargado: {downloadedAs}</Text>
          ) : null}
          {downloadError ? <Text className="text-expense mt-2 text-sm">{downloadError}</Text> : null}
        </Card>

        <Card title="2. Importar la plantilla llena">
          {Platform.OS !== 'web' ? (
            <Text className="text-warning text-sm">
              Importar desde un archivo solo está disponible en la versión web.
            </Text>
          ) : (
            <View className="gap-3">
              <Button label="Elegir archivo…" variant="ghost" onPress={onPickFile} />
              {pickError ? <Text className="text-expense text-sm">{pickError}</Text> : null}

              {picked ? (
                <View className="gap-1 rounded-xl bg-surface-2 p-3">
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    {picked.name}
                  </Text>
                  <Text className="text-text-muted text-xs">
                    {(picked.size / 1024).toFixed(0)} KB
                  </Text>
                </View>
              ) : null}

              {picked ? (
                <Button
                  label="Importar"
                  loading={importXlsx.isPending}
                  onPress={onImport}
                />
              ) : null}
              {importError ? <Text className="text-expense text-sm">{importError}</Text> : null}
            </View>
          )}

          {result ? (
            <View className="mt-3 gap-2">
              <Text className="text-income text-sm" style={{ fontFamily: fonts.semibold }}>
                {result.created} {result.created === 1 ? 'transacción creada' : 'transacciones creadas'}
              </Text>
              {result.errors.length > 0 ? (
                <View className="gap-1.5 rounded-xl bg-expense/10 p-3">
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    {result.errors.length} {result.errors.length === 1 ? 'fila con error' : 'filas con error'}
                  </Text>
                  {result.errors.map((e) => (
                    <Text key={e.row} className="text-text-muted text-xs">
                      Fila {e.row}: {e.message}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
