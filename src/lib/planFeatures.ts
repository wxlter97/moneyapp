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
  | 'quick_add'
  | 'calendar'
  | 'notifications'
  | 'wallet_split'
  | 'transaction_duplicate'
  | 'refunds'
  | 'split_categories'
  | 'split_people'
  | 'installments'
  | 'statements'
  | 'net_worth';

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
  calendar: 'Calendario financiero',
  notifications: 'Avisos y recordatorios',
  wallet_split: 'Dividir una cartera en varias',
  transaction_duplicate: 'Duplicar una transacción',
  refunds: 'Registrar reembolsos',
  split_categories: 'Dividir una transacción entre categorías',
  split_people: 'Dividir gastos entre personas',
  installments: 'Compras a plazo',
  statements: 'Estados de cuenta de tarjeta',
  net_worth: 'Patrimonio neto',
};

/** Cuotas mensuales de IA (`apps/ai/quotas.py`): en `Plan.features` son un
 * número, no un flag -- se muestran con la cantidad, no como una clave cruda. */
const AI_LIMIT_LABEL: Record<string, (n: number | null) => string> = {
  ai_receipts_per_month: (n) =>
    n == null ? 'Lectura de recibos con IA ilimitada' : `${n} recibos leídos con IA al mes`,
  ai_parses_per_month: (n) =>
    n == null
      ? 'Carga con IA escribiendo una frase, ilimitada'
      : `${n} movimientos cargados con IA escribiendo una frase, al mes`,
  ai_chats_per_month: (n) =>
    n == null ? 'Consultas al asistente de IA ilimitadas' : `${n} consultas al asistente de IA al mes`,
};

/** Renglones de beneficios de un plan para el catálogo (`pro.tsx`): los flags
 * en `true` y las cuotas de IA mayores a 0 (o ilimitadas). Una clave que la
 * app todavía no conoce se omite en vez de mostrarse cruda. */
export function planFeatureLabels(features: Record<string, boolean | number | null> | undefined): string[] {
  const labels: string[] = [];
  const aiLabels: string[] = [];
  for (const [key, value] of Object.entries(features ?? {})) {
    const aiLabel = AI_LIMIT_LABEL[key];
    if (aiLabel) {
      if (value === null || (typeof value === 'number' && value > 0)) aiLabels.push(aiLabel(value));
    } else if (value === true && key in FEATURE_LABEL) {
      labels.push(FEATURE_LABEL[key as FeatureKey]);
    }
  }
  return [...labels, ...aiLabels];
}

/**
 * Desde qué plan se desbloquea cada feature -- estático a propósito (mismo
 * criterio que `seed_billing_plans.py` en el backend: es una decisión de
 * producto, no algo que valga la pena traer con una consulta aparte sólo
 * para saber qué botón mostrar). Determina si `ProFeatureGate` ofrece
 * "Pasate a Plus" o "Pasate a Pro".
 */
export const FEATURE_MIN_PLAN: Record<FeatureKey, 'plus' | 'pro'> = {
  import_email: 'pro',
  import_excel: 'pro',
  net_worth_history: 'plus',
  advanced_reports: 'pro',
  export: 'plus',
  backup: 'pro',
  loyalty: 'pro',
  multi_currency: 'plus',
  quick_add: 'pro',
  calendar: 'plus',
  notifications: 'plus',
  wallet_split: 'plus',
  transaction_duplicate: 'plus',
  refunds: 'plus',
  split_categories: 'plus',
  split_people: 'plus',
  installments: 'plus',
  statements: 'plus',
  net_worth: 'plus',
};

/** Copy más largo para el upsell de pantalla completa (`ProFeatureGate`). */
export const FEATURE_COPY: Record<FeatureKey, { title: string; description: string }> = {
  import_email: {
    title: 'Importación automática',
    description:
      'Conectá tu correo bancario para que porksupuesto cree las transacciones solo, sin escribirlas a mano.',
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
  calendar: {
    title: 'Calendario financiero',
    description: 'Mirá tus recurrentes, cuotas y vencimientos acomodados en un calendario, no sólo en una lista.',
  },
  notifications: {
    title: 'Avisos y recordatorios',
    description: 'Recordatorios de recurrentes y cuotas por vencer, presupuesto por pasarte, saldo bajo y vencimiento de tarjeta -- push y en la app.',
  },
  wallet_split: {
    title: 'Dividir una cartera',
    description: 'Separá una cartera con actividad en dos, sin perder su historial ni su saldo.',
  },
  transaction_duplicate: {
    title: 'Duplicar una transacción',
    description: 'Repetí una transacción ya cargada en un toque, en vez de volver a escribirla.',
  },
  refunds: {
    title: 'Reembolsos',
    description: 'Registrá la plata que te devolvieron de un gasto como un movimiento real, no sólo un flag.',
  },
  split_categories: {
    title: 'Dividir entre categorías',
    description: 'Repartí una sola compra entre varias categorías -- p. ej. supermercado entre Comida e Higiene.',
  },
  split_people: {
    title: 'Dividir entre personas',
    description: 'Repartí un gasto con amigos o familia y llevá la cuenta de quién te debe qué.',
  },
  installments: {
    title: 'Compras a plazo',
    description: 'Registrá una compra en cuotas de tarjeta y seguí cuánto llevás pagado.',
  },
  statements: {
    title: 'Estados de cuenta',
    description: 'Mirá el estado de cuenta de tus tarjetas de crédito a la fecha de corte.',
  },
  net_worth: {
    title: 'Patrimonio neto',
    description: 'Cuánto tenés en total entre todas tus carteras, de un vistazo.',
  },
};
