import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import {
  useCreatePersonalToken,
  useDeletePersonalToken,
  usePersonalTokens,
  useWallets,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { walletLabel } from '@/api/queries/lookups';
import type { PersonalAccessToken } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { PickerRow } from '@/components/ui/PickerRow';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { config } from '@/config';
import { formatDateTime } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

const QUICK_ADD_URL = `${config.apiUrl}/quick-add/`;

/**
 * Tokens personales para agregar gastos desde un Atajo de Apple Shortcuts
 * (p. ej. disparado por la notificación de Apple Pay) sin abrir la app. El
 * JWT normal dura minutos y se renueva solo — un Atajo necesita algo que
 * viva indefinidamente, por eso es una credencial aparte y revocable.
 */
export default function ShortcutsScreen() {
  const tokensQ = usePersonalTokens();
  const walletsQ = useWallets();
  const createToken = useCreatePersonalToken();
  const deleteToken = useDeletePersonalToken();

  const [name, setName] = useState('');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<PersonalAccessToken | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const tokens = tokensQ.data ?? [];
  const refresh = usePullRefresh(tokensQ.isFetching && !tokensQ.isLoading, () => tokensQ.refetch());

  const walletOptions = useMemo(
    () => (walletsQ.data ?? []).map((w) => ({ value: w.id, label: walletLabel(w) })),
    [walletsQ.data],
  );

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed || !walletId) return;
    setCreateError(null);
    try {
      const token = await createToken.mutateAsync({ name: trimmed, walletId });
      haptics.success();
      setJustCreated(token);
      setName('');
      setWalletId(null);
    } catch (err) {
      haptics.error();
      setCreateError(errorMessage(err, 'No se pudo generar el token.'));
    }
  }

  async function onRevoke(id: string) {
    try {
      await deleteToken.mutateAsync(id);
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setConfirmRevokeId(null);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Atajos" />

      <ScrollView
        contentContainerClassName="gap-4 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        <Card>
          <Text className="text-text-muted text-sm leading-5">
            Agregá un gasto a este presupuesto desde un Atajo de Apple Shortcuts, sin
            abrir la app — por ejemplo, disparado por la notificación de Apple Pay
            apenas pagás con la tarjeta. Cada token queda fijo a una cartera; para
            cargar a otra cartera, generá otro.
          </Text>
        </Card>

        {justCreated ? (
          <RevealedTokenCard token={justCreated} onDismiss={() => setJustCreated(null)} />
        ) : null}

        {tokensQ.isLoading ? (
          <LoadingState />
        ) : tokensQ.isError ? (
          <ErrorState error={tokensQ.error} onRetry={tokensQ.refetch} />
        ) : tokens.length > 0 ? (
          <Card title="Tus tokens">
            {tokens.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <View className="h-px bg-border/30" /> : null}
                <TokenRow
                  token={t}
                  confirming={confirmRevokeId === t.id}
                  onAskRevoke={() => setConfirmRevokeId(t.id)}
                  onCancelRevoke={() => setConfirmRevokeId(null)}
                  onRevoke={() => onRevoke(t.id)}
                  revoking={deleteToken.isPending && confirmRevokeId === t.id}
                />
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            title="Sin tokens todavía"
            hint="Generá uno abajo para poder usarlo en un Atajo."
          />
        )}

        <Card title="Generar uno nuevo">
          <View className="gap-3">
            <TextField
              label="Nombre"
              placeholder="p. ej. iPhone de Juan"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (createError) setCreateError(null);
              }}
            />
            <PickerRow
              label="Cartera"
              options={walletOptions}
              value={walletId}
              onChange={(v) => {
                setWalletId(v);
                setWalletPickerOpen(false);
              }}
              open={walletPickerOpen}
              onToggle={() => setWalletPickerOpen((v) => !v)}
              placeholder={walletsQ.isLoading ? 'Cargando…' : 'Elegir'}
            />
            {createError ? <Text className="text-expense text-xs">{createError}</Text> : null}
            <Button
              label="Generar token"
              loading={createToken.isPending}
              disabled={!name.trim() || !walletId}
              onPress={onCreate}
            />
          </View>
        </Card>

        <SetupInstructionsCard />
      </ScrollView>
    </Screen>
  );
}

function TokenRow({
  token,
  confirming,
  onAskRevoke,
  onCancelRevoke,
  onRevoke,
  revoking,
}: {
  token: PersonalAccessToken;
  confirming: boolean;
  onAskRevoke: () => void;
  onCancelRevoke: () => void;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const colors = useColors();

  return (
    <View className="py-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
          <Icon name="bolt" size={16} color={colors.textMuted} />
        </View>
        <View className="flex-1">
          <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
            {token.name}
          </Text>
          <Text className="text-text-muted text-xs" numberOfLines={1}>
            {token.wallet_name} · {token.prefix}…
          </Text>
        </View>
        <Text className="text-text-muted text-[11px]">
          {token.last_used_at ? formatDateTime(token.last_used_at) : 'Nunca usado'}
        </Text>
      </View>

      {confirming ? (
        <View className="mt-3 gap-2 rounded-2xl bg-expense/10 p-3">
          <Text className="text-text text-sm">
            ¿Revocar «{token.name}»? El Atajo que lo use deja de funcionar.
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label="Cancelar" variant="ghost" onPress={onCancelRevoke} />
            </View>
            <View className="flex-1">
              <Button label="Revocar" loading={revoking} onPress={onRevoke} />
            </View>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={onAskRevoke}
          className="mt-2 self-start py-1 active:opacity-60"
          accessibilityRole="button"
        >
          <Text className="text-expense text-xs">Revocar</Text>
        </Pressable>
      )}
    </View>
  );
}

function RevealedTokenCard({
  token,
  onDismiss,
}: {
  token: PersonalAccessToken;
  onDismiss: () => void;
}) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!token.token) return;
    await Clipboard.setStringAsync(token.token);
    haptics.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border border-primary/30">
      <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
        Guardalo ahora — no lo vamos a volver a mostrar
      </Text>
      <Text className="text-text-muted mt-1 text-xs leading-4">
        Pegalo en el paso "Obtener contenido de URL" del Atajo, en el header Authorization.
      </Text>

      <Pressable
        onPress={onCopy}
        className="mt-3 flex-row items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Copiar token"
      >
        <Text
          className="text-text mr-2 flex-1 text-sm"
          style={{ fontFamily: fonts.semibold }}
          numberOfLines={1}
        >
          {token.token}
        </Text>
        <Icon name={copied ? 'check' : 'copy'} size={16} color={copied ? colors.income : colors.textMuted} />
      </Pressable>

      <Pressable onPress={onDismiss} className="mt-3 self-start py-1 active:opacity-60" accessibilityRole="button">
        <Text className="text-text-muted text-xs">Ya lo guardé</Text>
      </Pressable>
    </Card>
  );
}

function SetupInstructionsCard() {
  return (
    <Card title="Cómo armarlo en Shortcuts">
      <View className="gap-3">
        <Step n={1} text="Disparador: “Cuando reciba una notificación” de Wallet (o corré el Atajo a mano)." />
        <Step n={2} text="Obtené el monto y el comercio del texto de la notificación." />
        <Step n={3} text="Acción “Obtener contenido de URL” — POST a la dirección de abajo." />
        <Step n={4} text="Header Authorization: Bearer + el token de arriba. Body JSON con amount y merchant." />

        <View className="gap-1.5 rounded-xl bg-surface-2 px-3 py-3">
          <Text className="text-text-muted text-[10px] uppercase tracking-wide">URL</Text>
          <Text className="text-text text-xs" style={{ fontFamily: fonts.semibold }} selectable>
            {QUICK_ADD_URL}
          </Text>
        </View>

        <View className="gap-1 rounded-xl bg-surface-2 px-3 py-3">
          <Text className="text-text-muted text-[10px] uppercase tracking-wide">Body (JSON)</Text>
          <Text className="text-text text-xs" selectable style={{ fontFamily: fonts.semibold }}>
            {'{ "amount": 12.50, "merchant": "Super Selectos" }'}
          </Text>
        </View>

        <Text className="text-text-muted text-xs leading-4">
          Sin "category" (o con "category": "auto") adivinamos la categoría por cómo
          categorizaste antes ese mismo comercio. Si nunca la usaste, la respuesta trae
          la lista de categorías para que el Atajo te pregunte y reintente con el id
          elegido.
        </Text>
      </View>
    </Card>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View className="flex-row gap-2.5">
      <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-surface-2">
        <Text className="text-text-muted text-[11px]" style={{ fontFamily: fonts.semibold }}>
          {n}
        </Text>
      </View>
      <Text className="text-text-muted flex-1 text-sm leading-5">{text}</Text>
    </View>
  );
}
