import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  useInviteMember,
  useMemberships,
  useRemoveMembership,
  useUpdateMembershipRole,
} from '@/api/queries';
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
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * Miembros del workspace activo: quién está adentro, invitar por correo
 * (solo el dueño), cambiar rol y quitar a alguien. El backend ya soportaba
 * todo esto (`/memberships/`) — esta pantalla era la única pieza que faltaba.
 */
export default function MembersScreen() {
  const colors = useColors();
  const currentUser = useAuthStore((s) => s.user);
  const activeWorkspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === s.activeId),
  );
  const isOwner = activeWorkspace?.role === 'owner';

  const membershipsQ = useMemberships();
  const invite = useInviteMember();
  const updateRole = useUpdateMembershipRole();
  const remove = useRemoveMembership();

  const [email, setEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const members = membershipsQ.data ?? [];
  const refresh = usePullRefresh(
    membershipsQ.isFetching && !membershipsQ.isLoading,
    () => membershipsQ.refetch(),
  );

  async function onInvite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setInviteError(null);
    try {
      await invite.mutateAsync({ email: trimmed });
      haptics.success();
      setEmail('');
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
    } catch (err) {
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

        {isOwner ? (
          <Card title="Invitar por correo">
            <Text className="text-text-muted mb-3 text-sm">
              La persona ya tiene que tener una cuenta creada en Budget con ese correo.
            </Text>
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
            </View>
          </Card>
        ) : (
          <Text className="text-text-muted px-1 text-xs">
            Sólo el dueño del presupuesto puede invitar o quitar miembros.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
