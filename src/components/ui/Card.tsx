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
// pestañas que se revisitan todo el tiempo (Presupuesto, Inicio), así
// que el goteo se repetía en cada visita en vez de verse una sola vez.
//
// Identidad wxlter. (Fase 3): borde fino + radio chico en vez de sombra +
// radio grande -- la disciplina de Ledger Brutalism (ver docs/audit-tasks.md)
// sin sus colores. La sombra no desaparece del todo (`elevation`/
// `shadowOpacity` bajos): sigue separando la card del fondo en superficies
// que no son planas (ej. la propia página en web), sólo deja de ser lo que
// hace el trabajo -- eso ahora es el borde.
export function Card({ children, title, action, className = '' }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-border bg-surface/95 p-4 ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 0,
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
