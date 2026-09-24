import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import {
  useClearFailedEmailImports,
  useEmailImportLogs,
  useRejectEmailImport,
  useRotateInboundToken,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { EmailImportLog, EmailImportStatus } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatShortDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { notifyError } from '@/lib/notifyError';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { useWorkspaceStore } from '@/store/workspace';

const STATUS_LABEL: Record<EmailImportStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  failed: 'No reconocida',
  auto_handled: 'Resuelto automático',
};

/**
 * Bandeja de revisión de correos bancarios: el pipeline de ingestión ya deja
 * cada correo parseado como candidata (`EmailImportLog`); acá se aprueba
 * (crea la Transaction) o se descarta. Por defecto solo pendientes; "Ver
 * todo" destapa el historial completo (solo lectura).
 */
export default function ImportsScreen() {
  const [showAll, setShowAll] = useState(false);
  const q = useEmailImportLogs(showAll ? undefined : 'pending');
  const reject = useRejectEmailImport();
  const clearFailed = useClearFailedEmailImports();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const activeWorkspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === s.activeId),
  );

  const items = q.data ?? [];
  const failedCount = items.filter((log) => log.status === 'failed').length;
  const refresh = usePullRefresh(q.isFetching && !q.isLoading, () => q.refetch());

  async function onReject(id: string) {
    try {
      await reject.mutateAsync(id);
      haptics.success();
    } catch (err) {
      notifyError(err, 'No se pudo descartar el correo.');
    } finally {
      setRejectingId(null);
    }
  }

  async function onClearFailed() {
    try {
      await clearFailed.mutateAsync();
      haptics.success();
    } catch (err) {
      notifyError(err, 'No se pudieron limpiar los fallidos.');
    } finally {
      setConfirmingClear(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Importaciones" />

      <ScrollView
        contentContainerClassName="gap-3 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        {activeWorkspace ? <InboundEmailCard workspace={activeWorkspace} /> : null}

        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              haptics.tap();
              setShowAll((v) => !v);
            }}
            className="py-1 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
              {showAll ? 'Solo pendientes' : 'Ver historial'}
            </Text>
          </Pressable>

          {showAll && failedCount > 0 && !confirmingClear ? (
            <Pressable
              onPress={() => {
                haptics.tap();
                setConfirmingClear(true);
              }}
              className="py-1 active:opacity-60"
              accessibilityRole="button"
            >
              <Text className="text-text-muted text-sm">Limpiar no reconocidas</Text>
            </Pressable>
          ) : null}
        </View>

        {confirmingClear ? (
          <View className="gap-2 rounded-2xl bg-expense/10 p-3">
            <Text className="text-text text-sm">
              ¿Borrar del historial {failedCount} correo(s) no reconocido(s)? No se puede deshacer.
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Cancelar" variant="ghost" onPress={() => setConfirmingClear(false)} />
              </View>
              <View className="flex-1">
                <Button label="Limpiar" loading={clearFailed.isPending} onPress={onClearFailed} />
              </View>
            </View>
          </View>
        ) : null}

        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title={showAll ? 'Sin importaciones' : 'Bandeja vacía'}
            hint={
              showAll
                ? 'Todavía no llegó ningún correo bancario.'
                : 'No hay correos bancarios esperando revisión.'
            }
          />
        ) : (
          items.map((log) => (
            <ImportCard
              key={log.id}
              log={log}
              confirming={rejectingId === log.id}
              onAskReject={() => setRejectingId(log.id)}
              onCancelReject={() => setRejectingId(null)}
              onReject={() => onReject(log.id)}
              rejecting={reject.isPending && rejectingId === log.id}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function ImportCard({
  log,
  confirming,
  onAskReject,
  onCancelReject,
  onReject,
  rejecting,
}: {
  log: EmailImportLog;
  confirming: boolean;
  onAskReject: () => void;
  onCancelReject: () => void;
  onReject: () => void;
  rejecting: boolean;
}) {
  const colors = useColors();
  const isPending = log.status === 'pending';

  return (
    <Card>
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
          <Icon name="inbox" size={16} color={colors.textMuted} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
            {log.status === 'auto_handled'
              ? 'Reenvío automático confirmado'
              : log.extracted_merchant || log.bank_name || 'Correo bancario'}
          </Text>
          <Text className="text-text-muted text-xs" numberOfLines={1}>
            {log.status === 'auto_handled'
              ? 'No era un correo bancario, era la verificación de tu proveedor de correo.'
              : (log.bank_name ?? 'Banco no identificado')}
            {log.status !== 'auto_handled' && log.extracted_date ? ` · ${formatShortDate(log.extracted_date)}` : ''}
          </Text>
          {log.raw_email_subject ? (
            <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={1}>
              {log.raw_email_subject}
            </Text>
          ) : null}
          {log.status === 'failed' && log.error_message ? (
            <Text className="text-expense mt-1 text-xs">{log.error_message}</Text>
          ) : null}
        </View>
        <View className="items-end gap-1">
          {log.extracted_amount ? (
            <Money value={log.extracted_amount} currency="USD" className="text-sm font-semibold" />
          ) : null}
          {!isPending ? (
            <View className="rounded-full bg-surface-2 px-2 py-0.5">
              <Text className="text-text-muted text-[10px] uppercase tracking-wide">
                {STATUS_LABEL[log.status]}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {isPending ? (
        confirming ? (
          <View className="mt-3 gap-2 rounded-2xl bg-expense/10 p-3">
            <Text className="text-text text-sm">¿Descartar esta candidata?</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Cancelar" variant="ghost" onPress={onCancelReject} />
              </View>
              <View className="flex-1">
                <Button label="Rechazar" loading={rejecting} onPress={onReject} />
              </View>
            </View>
          </View>
        ) : (
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button label="Rechazar" variant="ghost" onPress={onAskReject} />
            </View>
            <View className="flex-1">
              <Button
                label="Confirmar"
                onPress={() => {
                  haptics.tap();
                  router.push(`/import/${log.id}`);
                }}
              />
            </View>
          </View>
        )
      ) : null}
    </Card>
  );
}

type EmailProvider = 'gmail' | 'outlook' | 'icloud' | 'yahoo' | 'otro';

/**
 * Reenviar el correo a mano funciona siempre, pero es fricción que puede
 * espantar a un usuario nuevo. Cada proveedor de correo activa el reenvío
 * automático distinto -- esta guía junta los pasos exactos de cada uno.
 *
 * Ojo con Gmail: exige confirmar la dirección de reenvío con un click en un
 * link que Gmail manda... a esa misma dirección (nuestro webhook, no una
 * casilla que alguien lea). Lo confirmamos nosotros automáticamente apenas
 * llega ese correo (ver `_confirm_gmail_forwarding_link` en el backend), así
 * que del lado del usuario no hace falta ningún paso extra ahí.
 */
const PROVIDER_GUIDES: Record<EmailProvider, { label: string; settingsUrl?: string; steps: string[] }> = {
  gmail: {
    label: 'Gmail',
    settingsUrl: 'https://mail.google.com/mail/u/0/#settings/fwdandpop',
    steps: [
      'Abrí Gmail en la compu → Configuración → "Ver todos los ajustes" → pestaña "Reenvío y POP/IMAP".',
      'Tocá "Agregar una dirección de reenvío", pegá la dirección de arriba y confirmá.',
      'Vas a ver "en espera de confirmación" — no hace falta que hagas nada más: la confirmamos nosotros solos en cuanto llega el correo de verificación (unos segundos).',
      'Para que solo se reenvíen los correos del banco (no todo tu Gmail): Configuración → "Filtros y direcciones bloqueadas" → "Crear un filtro nuevo" → en "De" poné el correo o dominio de tu banco → "Crear filtro" → marcá "Reenviarlo a" y elegí la dirección ya verificada.',
    ],
  },
  outlook: {
    label: 'Outlook',
    settingsUrl: 'https://outlook.live.com/mail/0/options/mail/forwarding',
    steps: [
      'Abrí Configuración → Correo → Reenvío.',
      'Activá "Reenviar mi correo a otra cuenta" y pegá la dirección de arriba.',
      'Empieza a funcionar de una, sin confirmación. Si querés limitarlo solo al banco, mejor creá una regla ("Correo" → "Reglas") que aplique a los mensajes de tu banco con la acción "Reenviar a", en vez del reenvío global.',
    ],
  },
  icloud: {
    label: 'iCloud',
    settingsUrl: 'https://www.icloud.com/mail',
    steps: [
      'Entrá a icloud.com/mail → ícono de engranaje → Preferencias → pestaña "Reglas".',
      'Agregá una regla: "Si el remitente es" el correo de tu banco → "Entonces reenviar a" y pegá la dirección de arriba.',
      'Empieza a funcionar de una, sin confirmación.',
    ],
  },
  yahoo: {
    label: 'Yahoo',
    steps: [
      'Yahoo solo permite el reenvío automático con Yahoo Mail Plus (de pago) — con cuenta gratis no se puede activar.',
      'La alternativa es reenviar a mano: cuando te llegue un correo del banco, abrilo, tocá "Reenviar" y pegá la dirección de arriba.',
    ],
  },
  otro: {
    label: 'Otro',
    steps: [
      'Buscá en los ajustes de tu correo algo como "Reglas", "Filtros" o "Reenvío automático" (forwarding).',
      'La idea es la misma en todos: una regla que, cuando llegue un correo de tu banco, lo reenvíe a la dirección de arriba.',
    ],
  },
};

function InboundEmailCard({ workspace }: { workspace: { id: string; role: string; inbound_email: string } }) {
  const colors = useColors();
  const rotate = useRotateInboundToken();
  const [copied, setCopied] = useState(false);
  const [confirmingRotate, setConfirmingRotate] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [provider, setProvider] = useState<EmailProvider>('gmail');
  const isOwner = workspace.role === 'owner';
  const guide = PROVIDER_GUIDES[provider];

  async function onCopy() {
    await Clipboard.setStringAsync(workspace.inbound_email);
    haptics.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onRotate() {
    setRotateError(null);
    try {
      await rotate.mutateAsync(workspace.id);
      haptics.success();
      setConfirmingRotate(false);
    } catch (err) {
      haptics.error();
      setRotateError(errorMessage(err, 'No se pudo generar una dirección nueva.'));
    }
  }

  return (
    <Card title="Cómo funciona">
      <Text className="text-text-muted text-sm leading-5">
        Reenviá (o poné en copia) los correos de notificación de tu banco a esta
        dirección: cada uno llega acá como una candidata para revisar antes de
        crear el movimiento — nada se agrega solo.
      </Text>

      <Pressable
        onPress={onCopy}
        className="mt-3 flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Copiar dirección de importación"
      >
        <Text className="text-text flex-1 text-sm" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {workspace.inbound_email}
        </Text>
        <Icon name={copied ? 'check' : 'copy'} size={16} color={copied ? colors.income : colors.textMuted} />
      </Pressable>

      <Pressable
        onPress={() => {
          haptics.tap();
          setShowGuide((v) => !v);
        }}
        className="mt-3 self-start py-1 active:opacity-60"
        accessibilityRole="button"
      >
        <Text className="text-primary text-xs" style={{ fontFamily: fonts.semibold }}>
          {showGuide ? 'Ocultar guía de reenvío automático' : '¿Cómo activo el reenvío automático?'}
        </Text>
      </Pressable>

      {showGuide ? (
        <View className="mt-2 gap-3 rounded-2xl bg-surface-2 p-3">
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(PROVIDER_GUIDES) as EmailProvider[]).map((key) => {
              const active = key === provider;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    haptics.selection();
                    setProvider(key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                    active ? 'border-primary bg-primary' : 'border-border bg-surface'
                  }`}
                >
                  <Text className={active ? 'text-primary-fg text-xs font-semibold' : 'text-text-muted text-xs'}>
                    {PROVIDER_GUIDES[key].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {guide.steps.map((step, i) => (
            <View key={i} className="flex-row gap-2">
              <Text className="text-text-muted text-xs" style={{ fontFamily: fonts.semibold }}>
                {i + 1}.
              </Text>
              <Text className="text-text-muted flex-1 text-xs leading-5">{step}</Text>
            </View>
          ))}

          {guide.settingsUrl ? (
            <Pressable
              onPress={() => {
                haptics.tap();
                Linking.openURL(guide.settingsUrl!);
              }}
              className="mt-1 self-start rounded-xl bg-surface px-3 py-2 active:opacity-70"
              accessibilityRole="button"
            >
              <Text className="text-primary text-xs" style={{ fontFamily: fonts.semibold }}>
                Abrir configuración de {guide.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isOwner ? (
        confirmingRotate ? (
          <View className="mt-3 gap-2 rounded-2xl bg-expense/10 p-3">
            <Text className="text-text text-sm">
              La dirección actual deja de funcionar. Vas a tener que avisarle a tu banco
              (o a quien te reenvíe los correos) de la nueva.
            </Text>
            {rotateError ? <Text className="text-expense text-xs">{rotateError}</Text> : null}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Cancelar" variant="ghost" onPress={() => setConfirmingRotate(false)} />
              </View>
              <View className="flex-1">
                <Button label="Generar nueva" loading={rotate.isPending} onPress={onRotate} />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirmingRotate(true)}
            className="mt-3 self-start py-1 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-text-muted text-xs">¿Se filtró? Generar una dirección nueva</Text>
          </Pressable>
        )
      ) : null}
    </Card>
  );
}
