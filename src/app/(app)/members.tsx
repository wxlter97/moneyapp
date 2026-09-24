import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  useCancelWorkspaceInvitation,
  useInviteMember,
  useLeaveWorkspace,
  useMemberships,
  useRemoveMembership,
  useResendWorkspaceInvitation,
  useUpdateMembershipRole,
  useWorkspaceInvitations,
} from '@/api/queries';
import { isInvitation } from '@/api/resources';
import { errorMessage } from '@/api/errors';
import type { Membership } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { isPlanUpgradeError } from '@/lib/planErrors';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * Miembros del workspace activo: quién está adentro, invitar por correo
 * (solo el dueño), cambiar rol y quitar a alguien, las invitaciones que
 * todavía nadie aceptó (reenviar / cancelar) y salir del presupuesto.
 */
export default function MembersScreen() {
  const colors = useColors();
  const currentUser = useAuthStore((s) => s.user);
  const activeWorkspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === s.activeId),
  );
  const isOwner = activeWorkspace?.role === 'owner';
  const otherWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id !== s.activeId));

  const membershipsQ = useMemberships();
  const invite = useInviteMember();
  const updateRole = useUpdateMembershipRole();
  const remove = useRemoveMembership();
  const invitationsQ = useWorkspaceInvitations();
  const cancelInvitation = useCancelWorkspaceInvitation();
  const resendInvitation = useResendWorkspaceInvitation();
  const leave = useLeaveWorkspace();

  const [email, setEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  // Resultado del último reenviar/cancelar, por invitación: el backend
  // limita el reenvío a uno por minuto y ese mensaje hay que mostrarlo.
  const [invitationNote, setInvitationNote] = useState<{ id: string; text: string } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const members = membershipsQ.data ?? [];
  const pendingInvitations = invitationsQ.data ?? [];
  const ownerCount = members.filter((m) => m.role === 'owner').length;
  const refresh = usePullRefresh(
    (membershipsQ.isFetching && !membershipsQ.isLoading) ||
      (invitationsQ.isFetching && !invitationsQ.isLoading),
    () => Promise.all([membershipsQ.refetch(), invitationsQ.refetch()]),
  );

  // Por qué no se puede salir, o null si se puede. Las mismas reglas que
  // valida `leave` en el backend, para no ofrecer un botón que va a fallar.
  const leaveBlockedReason = !otherWorkspace
    ? 'Es tu único presupuesto: creá otro antes de salir de éste.'
    : isOwner && ownerCount <= 1
      ? members.length > 1
        ? 'Sos el único dueño: nombrá a otro dueño antes de salir.'
        : 'Sos la única persona en este presupuesto: si ya no lo usás, borralo desde Presupuestos.'
      : null;

  async function onInvite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setInviteError(null);
    setInviteSentTo(null);
    try {
      const result = await invite.mutateAsync({ email: trimmed });
      haptics.success();
      setEmail('');
      // Si no tenía cuenta todavía, el backend le mandó un correo con el
      // enlace en vez de sumarla directo -- avisamos que quedó pendiente.
      if (isInvitation(result)) setInviteSentTo(trimmed);
    } catch (err) {
      haptics.error();
      setInviteError(errorMessage(err, 'No se pudo invitar a esa persona.'));
    }
  }

  async function onToggleRole(m: Membership) {
    setBusyId(m.id);
    try {
      await updateRole.mutateAsync({
        id: m.id,
        role: m.role === 'owner' ? 'member' : 'owner',
      });
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(id: string) {
    setBusyId(id);
    try {
      await remove.mutateAsync(id);
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setBusyId(null);
      setConfirmRemoveId(null);
    }
  }

  async function onResend(id: string) {
    setBusyId(id);
    setInvitationNote(null);
    try {
      await resendInvitation.mutateAsync(id);
      haptics.success();
      setInvitationNote({ id, text: 'Listo, le volvimos a mandar el correo.' });
    } catch (err) {
      haptics.error();
      setInvitationNote({ id, text: errorMessage(err, 'No se pudo reenviar la invitación.') });
    } finally {
      setBusyId(null);
    }
  }

  async function onCancelInvitation(id: string) {
    setBusyId(id);
    setInvitationNote(null);
    try {
      await cancelInvitation.mutateAsync(id);
      haptics.success();
    } catch (err) {
      haptics.error();
      setInvitationNote({ id, text: errorMessage(err, 'No se pudo cancelar la invitación.') });
    } finally {
      setBusyId(null);
    }
  }

  async function onLeave() {
    if (!otherWorkspace) return;
    setLeaveError(null);
    try {
      await leave.mutateAsync({ nextActiveId: otherWorkspace.id });
      haptics.success();
      router.replace('/dashboard');
    } catch (err) {
      haptics.error();
      setLeaveError(errorMessage(err, 'No se pudo salir del presupuesto.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Miembros" />

      <ScrollView
        contentContainerClassName="gap-4 py-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        {membershipsQ.isLoading ? (
          <LoadingState />
        ) : membershipsQ.isError ? (
          <ErrorState error={membershipsQ.error} onRetry={membershipsQ.refetch} />
        ) : members.length === 0 ? (
          <EmptyState title="Sin miembros" hint="Algo salió mal: todo workspace tiene al menos su dueño." />
        ) : (
          <Card title={`${activeWorkspace?.name ?? 'Presupuesto'} · ${members.length} ${members.length === 1 ? 'miembro' : 'miembros'}`}>
            {members.map((m, i) => {
              const isSelf = currentUser?.id === m.user;
              return (
                <View key={m.id}>
                  {i > 0 ? <View className="h-px bg-border/30" /> : null}
                  <View className="flex-row items-center gap-3 py-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                      <Icon name="users" size={16} color={colors.textMuted} />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-text text-base"
                        style={{ fontFamily: fonts.semibold }}
                        numberOfLines={1}
                      >
                        {m.username}
                        {isSelf ? ' (vos)' : ''}
                      </Text>
                      <Text className="text-text-muted text-xs" numberOfLines={1}>
                        {m.user_email}
                      </Text>
                    </View>
                    <View className="rounded-full bg-surface-2 px-2 py-0.5">
                      <Text className="text-text-muted text-[10px] uppercase tracking-wide">
                        {m.role === 'owner' ? 'Dueño' : 'Miembro'}
                      </Text>
                    </View>
                  </View>

                  {isOwner && !isSelf ? (
                    confirmRemoveId === m.id ? (
                      <View className="mb-3 gap-2 rounded-2xl bg-expense/10 p-3">
                        <Text className="text-text text-sm">¿Quitar a {m.username} del presupuesto?</Text>
                        <View className="flex-row gap-2">
                          <View className="flex-1">
                            <Button
                              label="Cancelar"
                              variant="ghost"
                              onPress={() => setConfirmRemoveId(null)}
                            />
                          </View>
                          <View className="flex-1">
                            <Button
                              label="Quitar"
                              loading={busyId === m.id}
                              onPress={() => onRemove(m.id)}
                            />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View className="mb-3 flex-row gap-2">
                        <Pressable
                          onPress={() => onToggleRole(m)}
                          disabled={busyId === m.id}
                          className="flex-1 items-center rounded-full border border-border py-2 active:opacity-70"
                          accessibilityRole="button"
                        >
                          <Text className="text-text text-xs" style={{ fontFamily: fonts.semibold }}>
                            {busyId === m.id
                              ? '…'
                              : m.role === 'owner'
                                ? 'Quitar de dueño'
                                : 'Hacer dueño'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setConfirmRemoveId(m.id)}
                          className="flex-1 items-center rounded-full border border-border py-2 active:opacity-70"
                          accessibilityRole="button"
                        >
                          <Text className="text-expense text-xs" style={{ fontFamily: fonts.semibold }}>
                            Quitar del presupuesto
                          </Text>
                        </Pressable>
                      </View>
                    )
                  ) : null}
                </View>
              );
            })}
          </Card>
        )}

        {pendingInvitations.length > 0 ? (
          <Card title={`Invitaciones pendientes · ${pendingInvitations.length}`}>
            {pendingInvitations.map((inv, i) => (
              <View key={inv.id}>
                {i > 0 ? <View className="h-px bg-border/30" /> : null}
                <View className="flex-row items-center gap-3 py-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                    <Icon name="mail" size={16} color={colors.textMuted} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-text text-base"
                      style={{ fontFamily: fonts.semibold }}
                      numberOfLines={1}
                    >
                      {inv.email}
                    </Text>
                    <Text className="text-text-muted text-xs" numberOfLines={1}>
                      Invitado el {formatDateTime(inv.created_at)}
                      {inv.invited_by_name ? ` por ${inv.invited_by_name}` : ''}
                    </Text>
                  </View>
                </View>
                {invitationNote?.id === inv.id ? (
                  <Text className="text-text-muted mb-2 text-xs">{invitationNote.text}</Text>
                ) : null}
                {isOwner ? (
                  <View className="mb-3 flex-row gap-2">
                    <Pressable
                      onPress={() => onResend(inv.id)}
                      disabled={busyId === inv.id}
                      className="flex-1 items-center rounded-full border border-border py-2 active:opacity-70"
                      accessibilityRole="button"
                    >
                      <Text className="text-text text-xs" style={{ fontFamily: fonts.semibold }}>
                        {busyId === inv.id ? '…' : 'Reenviar correo'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onCancelInvitation(inv.id)}
                      disabled={busyId === inv.id}
                      className="flex-1 items-center rounded-full border border-border py-2 active:opacity-70"
                      accessibilityRole="button"
                    >
                      <Text className="text-expense text-xs" style={{ fontFamily: fonts.semibold }}>
                        Cancelar invitación
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}

        {isOwner ? (
          <Card title="Invitar por correo">
            <Text className="text-text-muted mb-3 text-sm">
              Si ya tiene cuenta en porksupuesto con ese correo, entra directo. Si no,
              le mandamos un correo con un enlace para sumarse en cuanto se registre.
            </Text>
            {inviteSentTo ? (
              <View className="mb-3 gap-1 rounded-2xl bg-income/10 p-3">
                <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                  Le mandamos la invitación a {inviteSentTo}
                </Text>
                <Text className="text-text-muted text-xs">
                  Va a aparecerle en cuanto abra el enlace del correo (o cree una cuenta con ese mismo correo).
                </Text>
              </View>
            ) : null}
            <View className="gap-3">
              <TextField
                label="Correo"
                placeholder="nombre@correo.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (inviteError) setInviteError(null);
                  if (inviteSentTo) setInviteSentTo(null);
                }}
                error={inviteError ?? undefined}
                onSubmitEditing={onInvite}
              />
              <Button
                label="Invitar"
                loading={invite.isPending}
                disabled={!email.trim()}
                onPress={onInvite}
              />
              {/* Mensaje puntual del backend al llegar al límite de
                  miembros del plan (ver `can_add_member` en apps.billing). */}
              {isPlanUpgradeError(inviteError) ? (
                <Button label="Pasate a Pro" variant="ghost" onPress={() => router.push('/pro')} />
              ) : null}
            </View>
          </Card>
        ) : (
          <Text className="text-text-muted px-1 text-xs">
            Sólo el dueño del presupuesto puede invitar o quitar miembros.
          </Text>
        )}

        {membershipsQ.isSuccess ? (
          <Card title="Salir del presupuesto">
            {leaveBlockedReason ? (
              <Text className="text-text-muted text-sm">{leaveBlockedReason}</Text>
            ) : confirmLeave ? (
              <View className="gap-2 rounded-2xl bg-expense/10 p-3">
                <Text className="text-text text-sm">
                  ¿Salir de {activeWorkspace?.name ?? 'este presupuesto'}? Dejás de verlo; para
                  volver, alguien te tiene que invitar de nuevo.
                </Text>
                {leaveError ? <Text className="text-expense text-xs">{leaveError}</Text> : null}
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Cancelar"
                      variant="ghost"
                      onPress={() => {
                        setConfirmLeave(false);
                        setLeaveError(null);
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Button label="Salir" loading={leave.isPending} onPress={onLeave} />
                  </View>
                </View>
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-text-muted text-sm">
                  Dejás de ver este presupuesto y sus movimientos. Lo que cargaste queda para
                  los demás.
                </Text>
                <Pressable
                  onPress={() => setConfirmLeave(true)}
                  className="items-center rounded-full border border-border py-2 active:opacity-70"
                  accessibilityRole="button"
                >
                  <Text className="text-expense text-sm" style={{ fontFamily: fonts.semibold }}>
                    Salir del presupuesto
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
