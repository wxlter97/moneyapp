import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/store/auth';

export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#4F8CFF" />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/history' : '/login'} />;
}
