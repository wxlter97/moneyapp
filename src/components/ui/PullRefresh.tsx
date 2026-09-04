import { RefreshControl } from 'react-native';

import { useColors } from '@/theme';

/**
 * `<RefreshControl>` pre-tintado con el acento de la app, para no repetir
 * `tintColor`/`colors` en cada ScrollView. Uso: `refreshControl={usePullRefresh(...)}`.
 */
export function usePullRefresh(refreshing: boolean, onRefresh: () => void) {
  const colors = useColors();
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );
}
