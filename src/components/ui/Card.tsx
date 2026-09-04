import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  title?: string;
  /** Contenido alineado a la derecha del título (ej. un enlace, un valor). */
  action?: ReactNode;
  className?: string;
  /** Anima la entrada (deslizar + fundido). Úsalo en listas de cards. */
  animated?: boolean;
  /** Índice para escalonar la animación de entrada. */
  index?: number;
}

export function Card({
  children,
  title,
  action,
  className = '',
  animated = false,
  index = 0,
}: CardProps) {
  const v = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 240,
      delay: Math.min(index, 6) * 45,
      useNativeDriver: true,
    }).start();
  }, [animated, index, v]);

  const body = (
    <View
      className={`rounded-2xl border border-border bg-surface p-4 ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 1,
      }}
    >
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

  if (!animated) return body;

  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
        ],
      }}
    >
      {body}
    </Animated.View>
  );
}
