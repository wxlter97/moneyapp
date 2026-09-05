import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';

import { useAcceptInvitation, useDeclineInvitation, useInvitationPreview } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { FadeInView } from '@/components/ui/FadeInView';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useAuthStore } from '@/store/auth';
import { fonts } from '@/theme/typography';

/**
 * Destino del enlace `budget://invite/<token>` del correo de invitación
 * (Capa 4). Funciona con o sin sesión iniciada -- si no hay sesión, manda a
 * loguearse/registrarse y desde ahí la invitación se acepta en "Herramientas
 * → Invitaciones" (queda ahí esperando, no hace falta reabrir el enlace).
 */
export default function InvitePreviewScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);

  const previewQ = useInvitationPreview(token);
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  const invitation = previewQ.data;
  const isMine =
    !!user?.email && !!invitation?.email &&
    user.email.toLowerCase() === invitation.email.toLowerCase();

  async function onAccept() {
    if (!token) return;
    setError(null);
    try {
      await accept.mutateAsync(token);
      setDone('accepted');
      setTimeout(() => router.replace('/dashboard'), 900);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo aceptar la invitación.'));
    }
  }

  async function onDecline() {
    if (!token) return;
    setError(null);
    try {
      await decline.mutateAsync(token);
      setDone('declined');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo rechazar la invitación.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-6">
        <FadeInView>
          <View className="items-center gap-4">
            <BrandMark size={56} />

            {previewQ.isLoading ? (
              <LoadingState />
            ) : previewQ.isError ? (
              <View className="items-center gap-2">
                <Text className="text-text text-center text-base" style={{ fontFamily: fonts.semibold }}>
                  Este enlace ya no es válido
                </Text>
                <Text className="text-text-muted text-center text-sm">
                  Puede que ya la hayas usado, o que quien te invitó la haya cancelado.
                </Text>
              </View>
            ) : done ? (
              <Text className="text-text text-center text-base" style={{ fontFamily: fonts.semibold }}>
                {done === 'accepted' ? '¡Listo, ya sos parte del presupuesto!' : 'Invitación rechazada.'}
              </Text>
            ) : invitation ? (
              <View className="w-full max-w-sm items-center gap-4">
                <View className="items-center gap-1">
                  <Text className="text-text text-center text-lg" style={{ fontFamily: fonts.extrabold }}>
                    {invitation.workspace_name}
                  </Text>
                  <Text className="text-text-muted text-center text-sm">
                    {invitation.invited_by_name
                      ? `${invitation.invited_by_name} te invitó a compartir este presupuesto`
                      : 'Te invitaron a compartir este presupuesto'}{' '}
                    ({invitation.email}).
                  </Text>
                </View>

                {authStatus !== 'authenticated' ? (
                  <View className="w-full gap-3">
                    <Text className="text-text-muted text-center text-xs leading-4">
                      Iniciá sesión o creá una cuenta con {invitation.email} y después
                      abrí Herramientas → Invitaciones para aceptarla.
                    </Text>
                    <Link href="/login" asChild>
                      <Button label="Iniciar sesión" />
                    </Link>
                    <Link href="/register" asChild>
                      <Button label="Crear cuenta" variant="ghost" />
                    </Link>
                  </View>
                ) : !isMine ? (
                  <Text className="text-text-muted text-center text-sm">
                    Esta invitación es para {invitation.email}, pero iniciaste sesión como{' '}
                    {user?.email}. Cerrá sesión y volvé a abrir el enlace con la cuenta correcta.
                  </Text>
                ) : (
                  <View className="w-full gap-2">
                    {error ? <Text className="text-expense text-center text-xs">{error}</Text> : null}
                    <Button label="Aceptar" loading={accept.isPending} onPress={onAccept} />
                    <Button
                      label="Rechazar"
                      variant="ghost"
                      loading={decline.isPending}
                      onPress={onDecline}
                    />
                  </View>
                )}
              </View>
            ) : (
              <ErrorState error={undefined} onRetry={previewQ.refetch} />
            )}
          </View>
        </FadeInView>
      </View>
    </Screen>
  );
}
