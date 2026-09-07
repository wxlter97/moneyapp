import { router } from 'expo-router';

import type { IconName } from '@/components/ui/Icon';

export interface Tool {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
  /** Acción destructiva: es el único ícono que se pinta con color (rojo). */
  destructive?: boolean;
}

export interface ToolGroup {
  id: string;
  icon: IconName;
  label: string;
  hint: string;
  tools: Tool[];
}

/**
 * Herramientas agrupadas en carpetas (Herramientas → una carpeta → sus
 * opciones), en vez de 18+ botones sueltos en una sola pantalla: cuesta
 * encontrar algo así. Cada carpeta es su propia ruta (`/tools/[group]`), que
 * reusa el mismo grid de tiles que antes tenía la pantalla principal.
 */
export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'account',
    icon: 'users',
    label: 'Cuenta',
    hint: 'Perfil, seguridad, gente',
    tools: [
      {
        icon: 'users',
        label: 'Perfil',
        hint: 'Tu cuenta y vincular Google',
        onPress: () => router.push('/account'),
      },
      {
        icon: 'lock',
        label: 'Seguridad',
        hint: 'Bloqueo con Face ID o PIN',
        onPress: () => router.push('/security'),
      },
      {
        icon: 'bell',
        label: 'Notificaciones',
        hint: 'Recordatorios de recurrentes, cuotas y presupuesto',
        onPress: () => router.push('/notifications'),
      },
      {
        icon: 'users',
        label: 'Miembros',
        hint: 'Quién ve y edita este presupuesto',
        onPress: () => router.push('/members'),
      },
      {
        icon: 'mail',
        label: 'Invitaciones',
        hint: 'Presupuestos a los que te invitaron',
        onPress: () => router.push('/invitations'),
      },
    ],
  },
  {
    id: 'organization',
    icon: 'tag',
    label: 'Organización',
    hint: 'Categorías, etiquetas, cuotas',
    tools: [
      {
        icon: 'tag',
        label: 'Categorías',
        hint: 'Grupos y subcategorías',
        onPress: () => router.push('/categories'),
      },
      {
        icon: 'hash',
        label: 'Etiquetas',
        hint: 'Agrupa gasto transversal a la categoría',
        onPress: () => router.push('/tags'),
      },
      {
        icon: 'repeat',
        label: 'Recurrentes',
        hint: 'Gastos e ingresos fijos',
        onPress: () => router.push('/recurring'),
      },
      {
        icon: 'receipt',
        label: 'Compras a plazo',
        hint: 'Pagos en cuotas',
        onPress: () => router.push('/installments'),
      },
    ],
  },
  {
    id: 'analysis',
    icon: 'trending',
    label: 'Análisis',
    hint: 'Patrimonio, tendencias, tarjetas',
    tools: [
      {
        icon: 'trending',
        label: 'Patrimonio',
        hint: 'Evolución mes a mes',
        onPress: () => router.push('/net-worth-history'),
      },
      {
        icon: 'bars',
        label: 'Tendencias',
        hint: 'Ingresos, gastos y qué categorías crecieron',
        onPress: () => router.push('/trends'),
      },
      {
        icon: 'swap',
        label: 'Monedas',
        hint: 'Moneda base y tasas de cambio',
        onPress: () => router.push('/currencies'),
      },
      {
        icon: 'card',
        label: 'Estado de cuenta',
        hint: 'Cuánto debes en tus tarjetas',
        onPress: () => router.push('/statements'),
      },
    ],
  },
  {
    id: 'data',
    icon: 'archive',
    label: 'Datos',
    hint: 'Importar, exportar, respaldar',
    tools: [
      {
        icon: 'inbox',
        label: 'Importaciones',
        hint: 'Correos bancarios por revisar',
        onPress: () => router.push('/imports'),
      },
      {
        icon: 'download',
        label: 'Exportar datos',
        hint: 'Descarga en CSV',
        onPress: () => router.push('/export'),
      },
      {
        icon: 'archive',
        label: 'Respaldo',
        hint: 'Descargar o restaurar todo el presupuesto',
        onPress: () => router.push('/backup'),
      },
      {
        icon: 'reset',
        label: 'Restablecer',
        hint: 'Borrar datos del presupuesto',
        onPress: () => router.push('/reset'),
        destructive: true,
      },
    ],
  },
  {
    id: 'more',
    icon: 'bolt',
    label: 'Más',
    hint: 'Atajos y acerca de',
    tools: [
      {
        icon: 'bolt',
        label: 'Atajos',
        hint: 'Agregar gastos desde Apple Shortcuts',
        onPress: () => router.push('/shortcuts'),
      },
      {
        icon: 'info',
        label: 'Acerca de',
        hint: 'Qué es esta app y quién la hace',
        onPress: () => router.push('/about'),
      },
    ],
  },
];
