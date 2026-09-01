import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  title?: string;
  /** Contenido alineado a la derecha del título (ej. un enlace, un valor). */
  action?: ReactNode;
  className?: string;
}

export function Card({ children, title, action, className = '' }: CardProps) {
  return (
    <View className={`rounded-2xl border border-border bg-surface p-4 ${className}`}>
      {(title || action) && (
        <View className="mb-3 flex-row items-center justify-between">
          {title ? (
            <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}
