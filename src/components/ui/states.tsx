import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { Button } from './Button';

export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator color="#4F8CFF" />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View className="items-center justify-center gap-3 py-12">
      <Text className="text-text text-center">No se pudieron cargar los datos.</Text>
      <Text className="text-text-muted text-center text-xs">{errorMessage(error)}</Text>
      {onRetry ? <Button label="Reintentar" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center justify-center gap-1 py-12">
      <Text className="text-text-muted text-center">{title}</Text>
      {hint ? <Text className="text-text-muted text-center text-xs">{hint}</Text> : null}
    </View>
  );
}

/** Envuelve una query: muestra loading/error y sólo renderiza children con data. */
export function QueryBoundary<T>({
  query,
  children,
}: {
  query: {
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    data: T | undefined;
    refetch: () => void;
  };
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError || query.data === undefined) {
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }
  return <>{children(query.data)}</>;
}
