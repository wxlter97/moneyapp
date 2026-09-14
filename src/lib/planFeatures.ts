/**
 * Claves de `Plan.features` del backend (ver `apps.billing.models.Plan` y
 * `seed_billing_plans`) -- un solo lugar con la copy en español de cada una,
 * para no repetirla entre `pro.tsx` (catálogo) y `ProFeatureGate` (upsell
 * de cada pantalla gateada).
 */
export type FeatureKey =
  | 'import_email'
  | 'import_excel'
  | 'net_worth_history'
  | 'advanced_reports'
  | 'export'
  | 'backup'
  | 'loyalty'
  | 'multi_currency'
  | 'quick_add';

/** Un renglón por feature en "Con Pro conseguís" (`pro.tsx`). */
export const FEATURE_LABEL: Record<FeatureKey, string> = {
  import_email: 'Importación automática por correo',
  import_excel: 'Importar extractos de Excel',
  net_worth_history: 'Historial de patrimonio neto',
  advanced_reports: 'Tendencias, flujo de caja y más reportes',
  export: 'Exportar tus datos',
  backup: 'Respaldo y restauración con versiones',
  loyalty: 'Puntos y cashback de tarjetas',
  multi_currency: 'Múltiples monedas con conversión',
  quick_add: 'Atajos de Apple Shortcuts',
};

/** Copy más largo para el upsell de pantalla completa (`ProFeatureGate`). */
export const FEATURE_COPY: Record<FeatureKey, { title: string; description: string }> = {
  import_email: {
    title: 'Importación automática',
    description:
      'Conectá tu correo bancario para que Porsupuesto cree las transacciones solo, sin escribirlas a mano.',
  },
  import_excel: {
    title: 'Importar desde Excel',
    description: 'Cargá muchas transacciones de una vez desde una plantilla de Excel.',
  },
  net_worth_history: {
    title: 'Historial de patrimonio neto',
    description: 'Mirá cómo cambió tu patrimonio neto mes a mes, no sólo el número de hoy.',
  },
  advanced_reports: {
    title: 'Tendencias y flujo de caja',
    description:
      'Reportes con más de un mes de historia: gasto por categoría mes a mes y flujo de caja proyectado.',
  },
  export: {
    title: 'Exportar tus datos',
    description: 'Descargá todas tus transacciones en un archivo CSV.',
  },
  backup: {
    title: 'Respaldo y restauración',
    description: 'Descargá una copia completa de tu presupuesto, y restaurala cuando quieras.',
  },
  loyalty: {
    title: 'Puntos y cashback',
    description: 'Seguimiento de puntos, millas y cashback de tus tarjetas, categoría por categoría.',
  },
  multi_currency: {
    title: 'Múltiples monedas',
    description: 'Tasas de cambio para carteras en otra moneda, convertidas a la moneda base del presupuesto.',
  },
  quick_add: {
    title: 'Atajos de carga rápida',
    description: 'Creá un atajo de Apple Shortcuts para registrar un gasto sin abrir la app.',
  },
};
