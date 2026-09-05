import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAcceptInvitation, useDeclineInvitation, useMyInvitations } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { Invitation } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * Invitaciones pendientes A MÍ (por mi correo) a workspaces de otra persona
 * -- Capa 4. El enlace del correo (`budget://invite/<token>`) también llega
 * acá si ya estás logueado; esta pantalla es el lugar fijo para verlas todas
 * sin depender de haber abierto el enlace desde el correo.
 */
export default function InvitationsScreen() {
  const colors = useColors();
  const invitationsQ = useMyInvitations();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();

  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invitations = invitationsQ.data ?? [];
  const refresh = usePullRefresh(
    invitationsQ.isFetching && !invitationsQ.isLoading,
    () => invitationsQ.refetch(),
  );

  async function onAccept(inv: Invitation) {
    setBusyToken(inv.token);
    setError(null);
    try {
      await accept.mutateAsync(inv.token);
      haptics.success();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo aceptar la invitación.'));
    } finally {
      setBusyToken(null);
    }
  }

  async function onDecline(inv: Invitation) {
    setBusyToken(inv.token);
    setError(null);
    try {
      await decline.mutateAsync(inv.token);
      haptics.selection();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo rechazar la invitación.'));
    } finally {
      setBusyToken(null);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Invitaciones" />

      <ScrollView
        contentContainerClassName="gap-4 py-2"
        refreshControl={refresh}
      >
        <Card>
          <Text className="text-text-muted text-sm leading-5">
            Presupuestos a los que te invitaron por correo. Aceptar te suma como
            miembro; rechazar la descarta sin avisar a nadie.
          </Text>
        </Card>

        {error ? <Text className="text-expense px-1 text-xs">{error}</Text> : null}

        {invitationsQ.isLoading ? (
          <LoadingState />
        ) : invitationsQ.isError ? (
          <ErrorState error={invitationsQ.error} onRetry={invitationsQ.refetch} />
        ) : invitations.length === 0 ? (
          <EmptyState title="Sin invitaciones pendientes" hint="Cuando te inviten a un presupuesto, aparece acá." />
        ) : (
          invitations.map((inv) => {
            const busy = busyToken === inv.token;
            return (
              <Card key={inv.id}>
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                    <Icon name="users" size={16} color={colors.textMuted} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
                      {inv.workspace_name}
                    </Text>
                    <Text className="text-text-muted text-xs" numberOfLines={1}>
                      {inv.invited_by_name ? `Invitación de ${inv.invited_by_name}` : 'Te invitaron'} ·{' '}
                      {inv.role === 'owner' ? 'como dueño' : 'como miembro'}
                    </Text>
                  </View>
                </View>
                <View className="mt-3 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Rechazar"
                      variant="ghost"
                      loading={busy && decline.isPending}
                      disabled={busy}
                      onPress={() => onDecline(inv)}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Aceptar"
                      loading={busy && accept.isPending}
                      disabled={busy}
                      onPress={() => onAccept(inv)}
                    />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
