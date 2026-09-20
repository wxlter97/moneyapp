import { ActivityIndicator, View } from 'react-native';

import { useColors } from '@/theme';
import { Button } from './Button';

/**
 * Pie de una lista paginada: un indicador mientras llega la página siguiente y,
 * si hay más, un botón «Cargar más» -- respaldo del scroll automático (una
 * pantalla alta o un navegador de escritorio pueden no llegar a disparar el
 * `onScroll`). No pinta nada cuando ya se cargó todo.
 */
export function LoadMoreFooter({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const colors = useColors();
  if (isFetchingNextPage) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!hasNextPage) return null;
  return (
    <View className="items-center py-3">
      <Button label="Cargar más" variant="ghost" onPress={onLoadMore} />
    </View>
  );
}
