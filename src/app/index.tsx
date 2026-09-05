import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/store/auth';
import { useColors } from '@/theme';

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

  return <Redirect href={status === 'authenticated' ? '/dashboard' : '/login'} />;
}
