import { Image, ScrollView, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

/**
 * Herramientas → Cuenta → Perfil: quién sos y, si tu cuenta es de
 * usuario/contraseña, la opción de vincular Google (Capa 4) para poder
 * entrar también con "Continuar con Google" -- nunca crea una cuenta nueva,
 * solo la propia sesión activa lo hace (ver `GoogleLinkView` en el backend).
 */
export default function AccountScreen() {
  const colors = useColors();
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const initials = (user.first_name?.[0] ?? user.username[0] ?? '?').toUpperCase();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Perfil" />

      <ScrollView contentContainerClassName="gap-4 py-2">
        <Card>
          <View className="items-center gap-3 py-2">
            {user.profile_photo_url ? (
              <Image
                source={{ uri: user.profile_photo_url }}
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <View
                className="h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-lg text-white" style={{ fontFamily: fonts.bold }}>
                  {initials}
                </Text>
              </View>
            )}
            <View className="items-center">
              <Text className="text-text text-lg" style={{ fontFamily: fonts.bold }}>
                {fullName || user.username}
              </Text>
              <Text className="text-text-muted text-xs">{user.email}</Text>
            </View>
          </View>
        </Card>

        <Card title="Cuenta de Google">
          {user.google_linked ? (
            <View className="flex-row items-center gap-2 py-1">
              <Icon name="check" size={16} color={colors.income} />
              <Text className="text-text-muted flex-1 text-sm leading-5">
                Vinculada -- también podés entrar con "Continuar con Google"
                usando {user.email}.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-text-muted text-sm leading-5">
                Vinculá tu cuenta de Google ({user.email}) para poder entrar
                también con "Continuar con Google", sin perder tu contraseña
                actual.
              </Text>
              <GoogleSignInButton mode="link" />
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
