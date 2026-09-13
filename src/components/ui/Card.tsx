import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { fonts } from '@/theme/typography';

interface CardProps {
  children: ReactNode;
  title?: string;
  /** Contenido alineado a la derecha del título (ej. un enlace, un valor). */
  action?: ReactNode;
  className?: string;
}

// Tenía una entrada animada opcional (`animated`/`index`, fundido + desli-
// zamiento escalonado) para listas de cards -- se sacó: esas listas viven en
// pestañas que se revisitan todo el tiempo (Presupuesto, Vista general), así
// que el goteo se repetía en cada visita en vez de verse una sola vez.
export function Card({ children, title, action, className = '' }: CardProps) {
  return (
    <View
      className={`rounded-3xl bg-surface/95 p-4 ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 1,
      }}
    >
      {(title || action) && (
        <View className="mb-3 flex-row items-center justify-between">
          {title ? (
            <Text className="text-text text-[17px]" style={{ fontFamily: fonts.bold }}>
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
