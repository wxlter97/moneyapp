import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

import { useDownloadBackup, useRestoreWorkspace } from '@/api/queries';
import type { WorkspaceBackup } from '@/api/types';
import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { dismissModal, ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { haptics } from '@/lib/haptics';
import { downloadJsonFile, pickJsonFile } from '@/lib/export';
import { formatDateTime, todayISO } from '@/lib/date';
import { fonts } from '@/theme/typography';
import { useWorkspaceStore } from '@/store/workspace';

const COUNT_LABELS: Record<string, string> = {
  wallets: 'carteras',
  categories: 'categorías',
  tags: 'etiquetas',
  category_budgets: 'presupuestos',
  recurring_expenses: 'recurrentes',
  installment_purchases: 'compras a plazo',
  transactions: 'transacciones',
};

function isBackup(data: unknown): data is WorkspaceBackup {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as Record<string, unknown>).format === 'budget-app-backup'
  );
}

function countsOf(backup: WorkspaceBackup) {
  return Object.keys(COUNT_LABELS)
    .map((key) => ({ key, label: COUNT_LABELS[key], n: Array.isArray(backup[key]) ? (backup[key] as unknown[]).length : 0 }))
    .filter((c) => c.n > 0);
}

export default function BackupScreen() {
  const activeId = useWorkspaceStore((s) => s.activeId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const active = workspaces.find((w) => w.id === activeId);
  const target = active?.name ?? '';

  const download = useDownloadBackup();
  const restore = useRestoreWorkspace();

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadedAs, setDownloadedAs] = useState<string | null>(null);

  const [picked, setPicked] = useState<WorkspaceBackup | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  async function onDownload() {
    if (!activeId) return;
    setDownloadError(null);
    setDownloadedAs(null);
    try {
      const backup = await download.mutateAsync(activeId);
      const name = `budget-respaldo-${target || 'presupuesto'}-${todayISO()}.json`;
      const ok = downloadJsonFile(name, backup);
      if (ok) {
        setDownloadedAs(name);
        haptics.success();
      } else {
        setDownloadError('La descarga solo está disponible en la versión web.');
      }
    } catch (err) {
      setDownloadError(errorMessage(err, 'No se pudo generar el respaldo.'));
    }
  }

  async function onPickFile() {
    setPickError(null);
    setPicked(null);
    setTyped('');
    setRestored(false);
    const data = await pickJsonFile();
    if (data === null) {
      if (Platform.OS !== 'web') {
        setPickError('Restaurar desde un archivo solo está disponible en la versión web.');
      }
      return;
    }
    if (!isBackup(data)) {
      setPickError('Ese archivo no es un respaldo válido de Budget.');
      return;
    }
    setPicked(data);
    haptics.tap();
  }

  async function onRestore() {
    if (!activeId || !picked) return;
    setRestoreError(null);
    try {
      await restore.mutateAsync({ id: activeId, backup: picked });
      setRestored(true);
      haptics.success();
    } catch (err) {
      setRestoreError(errorMessage(err, 'No se pudo restaurar.'));
    }
  }

  const canRestore = !!picked && typed.trim() === target && !!activeId && !restore.isPending;

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Respaldo" />
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        <Card title="Descargar respaldo completo">
          <Text className="text-text-muted text-sm">
            Un archivo JSON con todo lo de este presupuesto: carteras, categorías, etiquetas,
            presupuestos por categoría, recurrentes, compras a plazo y transacciones (no incluye
            las fotos de recibo). Guárdalo en un lugar seguro para poder restaurarlo después.
          </Text>

          {Platform.OS !== 'web' ? (
            <Text className="text-warning mt-3 text-sm">
              La descarga de archivos solo está disponible en la versión web.
            </Text>
          ) : (
            <View className="mt-3">
              <Button label="Descargar respaldo (.json)" loading={download.isPending} onPress={onDownload} />
            </View>
          )}

          {downloadedAs ? (
            <Text className="text-income mt-2 text-sm">Descargado: {downloadedAs}</Text>
          ) : null}
          {downloadError ? <Text className="text-expense mt-2 text-sm">{downloadError}</Text> : null}
        </Card>

        <Card title="Restaurar desde un respaldo">
          <View className="rounded-2xl bg-expense/10 p-3">
            <Text className="text-text text-sm">
              Esto reemplaza TODO el contenido de{' '}
              <Text className="text-text text-sm" style={{ fontFamily: fonts.bold }}>
                {target}
              </Text>{' '}
              por lo que traiga el archivo. Lo que haya ahora se borra. No se puede deshacer.
            </Text>
          </View>

          {Platform.OS !== 'web' ? (
            <Text className="text-warning mt-3 text-sm">
              Restaurar desde un archivo solo está disponible en la versión web.
            </Text>
          ) : restored ? (
            <Text className="text-income mt-3 text-sm">
              Presupuesto restaurado. Ya puedes cerrar esta pantalla.
            </Text>
          ) : (
            <View className="mt-3 gap-3">
              <Button label="Elegir archivo de respaldo…" variant="ghost" onPress={onPickFile} />
              {pickError ? <Text className="text-expense text-sm">{pickError}</Text> : null}

              {picked ? (
                <View className="gap-2 rounded-xl bg-surface-2 p-3">
                  <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                    {String(picked.workspace_name ?? 'Respaldo')}
                  </Text>
                  {typeof picked.exported_at === 'string' ? (
                    <Text className="text-text-muted text-xs">
                      Exportado el {formatDateTime(picked.exported_at as string)}
                    </Text>
                  ) : null}
                  <Text className="text-text-muted text-xs">
                    {countsOf(picked)
                      .map((c) => `${c.n} ${c.label}`)
                      .join(' · ') || 'Vacío'}
                  </Text>
                </View>
              ) : null}

              {picked ? (
                <>
                  <TextField
                    label={`Escribe "${target}" para confirmar`}
                    value={typed}
                    onChangeText={setTyped}
                    autoCapitalize="none"
                    placeholder={target}
                  />
                  {restoreError ? <Text className="text-expense text-sm">{restoreError}</Text> : null}
                  <Button
                    label="Restaurar (reemplaza todo)"
                    loading={restore.isPending}
                    disabled={!canRestore}
                    onPress={onRestore}
                  />
                </>
              ) : null}
            </View>
          )}
        </Card>

        {restored ? <Button label="Listo" onPress={dismissModal} /> : null}
      </ScrollView>
    </Screen>
  );
}
