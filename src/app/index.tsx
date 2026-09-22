import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { LandingScreen } from '@/screens/LandingScreen';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/theme';

// Sin sesión: landing de marketing (ver `LandingScreen`), no un redirect
// ciego a `/login` -- es lo que ve un buscador o alguien que llega al
// dominio por primera vez, así que tiene que decir algo, no mandar directo
// al formulario de login.
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const colors = useColors();

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (status === 'authenticated') {
    return <Redirect href="/dashboard" />;
  }

  return <LandingScreen />;
}
