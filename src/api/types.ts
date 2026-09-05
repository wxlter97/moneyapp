/**
 * Tipos del API v1 (escritos a mano a partir de los serializers del backend).
 *
 * NOTA: los montos viajan como `string` (DecimalField de DRF). Usa los helpers
 * de `@/lib/money` para operar con ellos; no hagas `Number(x)` a ciegas.
 *
 * Cuando el backend estabilice el esquema, esto puede regenerarse desde
 * `GET /api/schema/` con `openapi-typescript`.
 */

export type UUID = string;
/** Decimal serializado como string, p. ej. "1234.56". */
export type Money = string;
/** Fecha ISO `YYYY-MM-DD`. */
export type ISODate = string;
/** Datetime ISO 8601. */
export type ISODateTime = string;

// ---------------------------------------------------------------------------
// Paginación (rest_framework.pagination.LimitOffsetPagination, PAGE_SIZE=50)
// ---------------------------------------------------------------------------
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ---------------------------------------------------------------------------
// Auth / usuario
// ---------------------------------------------------------------------------
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: ISODateTime;
}

export interface TokenPairResponse {
  access: string;
  refresh: string;
}

export interface RegisterResponse extends TokenPairResponse {
  user: User;
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------
export type WorkspaceRole = 'owner' | 'member' | '';

export interface Workspace {
  id: UUID;
  name: string;
  role: WorkspaceRole;
  member_count: number;
  /** Moneda en la que se expresan los totales agregados (patrimonio, presupuesto, flujo). */
  base_currency: string;
  inbound_token: string;
  inbound_email: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Tasa manual: 1 `currency` = `rate_to_base` de la moneda base del workspace. */
export interface ExchangeRate {
  id: UUID;
  currency: string;
  rate_to_base: string;
  updated_at: ISODateTime;
}

export interface Membership {
  id: UUID;
  user: number;
  username: string;
  user_email: string;
  role: Exclude<WorkspaceRole, ''>;
  joined_at: ISODateTime;
}

/**
 * Credencial de larga duración para un Atajo de Apple Shortcuts (u otro
 * cliente externo). `token` sólo viene poblado en la respuesta de creación
 * — después ni el dueño puede volver a leer el valor real, sólo revocarlo.
 */
export interface PersonalAccessToken {
  id: UUID;
  name: string;
  wallet: UUID;
  wallet_name: string;
  prefix: string;
  token: string | null;
  last_used_at: ISODateTime | null;
  created_at: ISODateTime;
}

/** Qué recordatorios push quiere recibir el usuario (una fila, no por workspace). */
export interface NotificationPreferences {
  remind_recurring: boolean;
  remind_installments: boolean;
  warn_budget: boolean;
  /** % del presupuesto de una categoría a partir del cual avisar (50-100). */
  budget_threshold_pct: number;
}

// ---------------------------------------------------------------------------
// Carteras (Wallet) / patrimonio
// ---------------------------------------------------------------------------
export type Visibility = 'shared' | 'private';

/** gasto · ahorro · deuda · activo */
export type WalletPurpose = 'spending' | 'savings' | 'debt' | 'asset';

export const WALLET_PURPOSES: WalletPurpose[] = ['spending', 'savings', 'debt', 'asset'];

export const PURPOSE_LABEL: Record<WalletPurpose, string> = {
  spending: 'Gasto',
  savings: 'Ahorro',
  debt: 'Deuda',
  asset: 'Activo',
};

/** Subtipo de cartera (estilo Buddy): banco · crédito · efectivo · personalizada */
export type WalletKind = 'bank' | 'credit' | 'cash' | 'custom';

export const WALLET_KINDS: WalletKind[] = ['bank', 'credit', 'cash', 'custom'];

export const WALLET_KIND_LABEL: Record<WalletKind, string> = {
  bank: 'Banco',
  credit: 'Crédito',
  cash: 'Efectivo',
  custom: 'Personalizada',
};

export interface Wallet {
  id: UUID;
  name: string;
  purpose: WalletPurpose;
  kind: WalletKind;
  /** Color de acento hex "#RRGGBB"; "" = color por defecto del tipo. */
  color: string;
  parent: UUID | null;
  currency: string;
  opening_balance: Money;
  /** Saldo propio (sin hijos). */
  current_balance: Money;
  /** Saldo propio + el de los descendientes. */
  aggregated_balance: Money;
  counts_toward_net_worth: boolean;
  /** Límite de la tarjeta de crédito (solo `kind: 'credit'`). */
  credit_limit: Money | null;
  /** Crédito disponible = límite + saldo; null si no es tarjeta con límite. */
  available_credit: Money | null;
  goal_amount: Money | null;
  goal_date: ISODate | null;
  monthly_contribution: Money | null;
  /** current_balance / goal_amount, o null si no hay meta. */
  progress_pct: number | null;
  card_last4: string | null;
  billing_cycle_day: number | null;
  payment_due_day: number | null;
  interest_rate: string | null;
  due_date: ISODate | null;
  counterparty: string;
  visibility: Visibility;
  owner: number | null;
  is_active: boolean;
  /** Archivada: oculta de la lista, pero sigue contando al patrimonio. */
  is_archived: boolean;
  sort_order: number;
  is_default: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Payload de alta/edición de cartera. */
export interface WalletInput {
  name: string;
  purpose: WalletPurpose;
  kind?: WalletKind;
  color?: string;
  parent?: UUID | null;
  currency?: string;
  opening_balance?: Money;
  counts_toward_net_worth?: boolean;
  credit_limit?: Money | null;
  goal_amount?: Money | null;
  goal_date?: ISODate | null;
  monthly_contribution?: Money | null;
  card_last4?: string | null;
  billing_cycle_day?: number | null;
  payment_due_day?: number | null;
  interest_rate?: string | null;
  due_date?: ISODate | null;
  counterparty?: string;
  visibility?: Visibility;
  is_active?: boolean;
  is_archived?: boolean;
  is_default?: boolean;
}

// ---------------------------------------------------------------------------
// Categorías / transacciones / presupuestos
// ---------------------------------------------------------------------------
export type CategoryType = 'income' | 'expense';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: UUID;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  /** null = es un GRUPO (bucket de presupuesto); con valor = subcategoría. */
  parent: UUID | null;
  /** true cuando `parent` es null. */
  is_group: boolean;
  sort_order: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Payload de alta/edición de categoría. */
export interface CategoryInput {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parent?: UUID | null;
  sort_order?: number;
}

export type TransactionSource =
  | 'manual'
  | 'email_import'
  | 'recurring'
  | 'installment'
  | 'quick_add';

export interface Transaction {
  id: UUID;
  type: TransactionType;
  wallet: UUID;
  /** Solo transferencias: cartera destino. */
  to_wallet: UUID | null;
  /** null en transferencias. */
  category: UUID | null;
  amount: Money;
  currency: string;
  description: string;
  date: ISODate;
  /** El archivo en sí se sube/lee por separado, ver `transactions.receiptUrl`. */
  has_receipt: boolean;
  /** Si false, el gasto no cuenta contra el presupuesto de su categoría. */
  counts_toward_budget: boolean;
  source: TransactionSource;
  is_recurring: boolean;
  /** Compartido por todas las partes de una transacción dividida; null si no lo está. */
  split_group: UUID | null;
  /** Etiquetas libres asignadas -- ver `tag_names` en TransactionInput para escribirlas. */
  tags: Tag[];
  created_by: number | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Una parte al dividir una transacción — ver `transactions.split`. */
export interface TransactionSplitPart {
  category: UUID;
  amount: Money;
  description?: string;
}

/**
 * Payload de alta/edición de transacción.
 * - income/expense: `category` requerida; `type` puede omitirse (se deduce).
 * - transfer: `type: 'transfer'` + `to_wallet`; sin categoría.
 */
export interface TransactionInput {
  type?: TransactionType;
  wallet: UUID;
  to_wallet?: UUID | null;
  category?: UUID | null;
  amount: Money;
  date: ISODate;
  description?: string;
  currency?: string;
  counts_toward_budget?: boolean;
  /** Nombres de etiqueta tal como los escribe el usuario -- se reusan las
   * que ya existen (sin distinguir mayúsculas) y se crean las que no.
   * Omitir deja las etiquetas actuales sin cambios al editar. */
  tag_names?: string[];
}

/** Etiqueta libre, transversal a la categoría (p. ej. "viaje-cancún"). */
export interface Tag {
  id: UUID;
  name: string;
  created_at: ISODateTime;
}

/** Fila de `tags/summary/`: total acumulado de una etiqueta. */
export interface TagSummary {
  id: UUID;
  name: string;
  income: Money;
  expense: Money;
  count: number;
  first_date: ISODate | null;
  last_date: ISODate | null;
}

export interface CategoryBudget {
  id: UUID;
  category: UUID;
  amount: Money;
  month: number;
  year: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Payload de alta/edición de presupuesto de categoría. */
export interface CategoryBudgetInput {
  category: UUID;
  amount: Money;
  month: number;
  year: number;
}

// ---------------------------------------------------------------------------
// Gastos / ingresos recurrentes
// ---------------------------------------------------------------------------
export type RecurrenceFrequency =
  | 'weekly'
  | 'biweekly'
  | 'every_3_weeks'
  | 'every_4_weeks'
  | 'monthly'
  | 'every_2_months'
  | 'every_3_months'
  | 'every_4_months'
  | 'every_6_months'
  | 'yearly';

export const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = [
  'weekly',
  'biweekly',
  'every_3_weeks',
  'every_4_weeks',
  'monthly',
  'every_2_months',
  'every_3_months',
  'every_4_months',
  'every_6_months',
  'yearly',
];

export const RECURRENCE_LABEL: Record<RecurrenceFrequency, string> = {
  weekly: 'Cada semana',
  biweekly: 'Cada dos semanas',
  every_3_weeks: 'Cada tres semanas',
  every_4_weeks: 'Cada cuatro semanas',
  monthly: 'Cada mes',
  every_2_months: 'Cada dos meses',
  every_3_months: 'Cada tres meses',
  every_4_months: 'Cada cuatro meses',
  every_6_months: 'Cada seis meses',
  yearly: 'Cada año',
};

export interface RecurringExpense {
  id: UUID;
  category: UUID;
  wallet: UUID;
  amount: Money;
  frequency: RecurrenceFrequency;
  next_due_date: ISODate;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface RecurringExpenseInput {
  category: UUID;
  wallet: UUID;
  amount: Money;
  frequency: RecurrenceFrequency;
  next_due_date: ISODate;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Compras a plazo (cuotas)
// ---------------------------------------------------------------------------
export interface InstallmentPurchase {
  id: UUID;
  wallet: UUID;
  /** Tarjeta de crédito: cartera desde la que se pagan las cuotas. */
  payment_wallet: UUID | null;
  category: UUID;
  description: string;
  total_amount: Money;
  installment_amount: Money;
  installments_total: number;
  installments_paid: number;
  start_date: ISODate;
  is_completed: boolean;
  /** true si `payment_wallet` está definido (compra con tarjeta). */
  is_credit_card: boolean;
  /** installment_amount × (total − pagadas). */
  remaining_amount: Money;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface InstallmentPurchaseInput {
  wallet: UUID;
  payment_wallet?: UUID | null;
  category: UUID;
  description: string;
  total_amount: Money;
  installment_amount: Money;
  installments_total: number;
  installments_paid?: number;
  start_date: ISODate;
}

export interface MonthlySnapshot {
  id: UUID;
  month: number;
  year: number;
  total_net_worth: Money;
  total_income: Money;
  total_expenses: Money;
  created_at: ISODateTime;
}

// ---------------------------------------------------------------------------
// Importación bancaria por correo (bandeja de revisión)
// ---------------------------------------------------------------------------
export type EmailImportStatus = 'pending' | 'confirmed' | 'rejected' | 'failed';

export interface EmailImportLog {
  id: UUID;
  status: EmailImportStatus;
  bank_schema: UUID | null;
  bank_name: string | null;
  wallet: UUID | null;
  raw_email_subject: string;
  extracted_amount: Money | null;
  extracted_merchant: string;
  extracted_date: ISODate | null;
  resulting_transaction: UUID | null;
  error_message: string;
  created_at: ISODateTime;
}

/** Datos para materializar la Transaction al confirmar una candidata. */
export interface ConfirmEmailImportInput {
  category: UUID;
  wallet?: UUID;
  amount?: string;
  date?: ISODate;
  description?: string;
}

// ---------------------------------------------------------------------------
// Reportes (agregaciones, solo lectura, workspace del header)
// ---------------------------------------------------------------------------
export interface NetWorthBreakdown {
  net: Money;
  by_purpose: Record<WalletPurpose, Money>;
  /** Moneda en la que ya vienen convertidos `net`/`by_purpose`. */
  base_currency: string;
}

export interface BudgetRow {
  category: UUID;
  category_name: string | null;
  budgeted: Money;
  spent: Money;
  remaining: Money;
  provision: Money;
}

/** Fila agregada por grupo de presupuesto (categoría sin padre). */
export interface BudgetGroup {
  /** null cuando el grupo es una categoría suelta sin subcategorías. */
  group: UUID | null;
  group_name: string;
  budgeted: Money;
  spent: Money;
  remaining: Money;
  rows: BudgetRow[];
}

export interface BudgetReport {
  year: number;
  month: number;
  base_currency: string;
  rows: BudgetRow[];
  groups: BudgetGroup[];
  totals: { budgeted: Money; spent: Money; remaining: Money };
}

// ---------------------------------------------------------------------------
// Programado (recurrentes + cuotas próximas, sin materializar)
// ---------------------------------------------------------------------------
export type ScheduledKind = 'recurring' | 'installment';

export interface ScheduledItem {
  date: ISODate;
  kind: ScheduledKind;
  /** id del RecurringExpense o InstallmentPurchase de origen. */
  source_id: UUID;
  description: string;
  amount: Money;
  category: UUID | null;
  category_name: string | null;
  wallet: UUID;
  wallet_name: string;
}

export interface CashflowPoint {
  year: number;
  month: number;
  income: Money;
  expenses: Money;
  net: Money;
}

export interface SpendRow {
  category: UUID;
  category_name: string | null;
  spent: Money;
}

export interface DashboardSummary {
  month: CashflowPoint;
  net_worth: Money;
  base_currency: string;
  pending_email_imports: number;
  top_expense_categories: SpendRow[];
}

export interface CategoryTrend {
  category: UUID;
  category_name: string | null;
  /** Un monto por mes, mismo orden que `months` de la respuesta. */
  amounts: Money[];
  /** Mes en curso vs. el anterior -- puede ser negativo (bajó). */
  change: Money;
  change_pct: number | null;
}

export interface CategoryTrendsResponse {
  months: { year: number; month: number }[];
  /** Ordenadas: la que más creció primero. */
  categories: CategoryTrend[];
}

/** Candidata a recurrente detectada en el historial -- ver `recurring-expenses/suggestions/`. */
export interface RecurringSuggestion {
  type: 'income' | 'expense';
  category: UUID;
  category_name: string;
  wallet: UUID;
  wallet_name: string;
  suggested_amount: Money;
  occurrences: number;
  last_date: ISODate;
  suggested_next_due_date: ISODate;
}

/** Proyección de una meta de ahorro -- ver `wallets/{id}/projection/`. */
export interface GoalProjection {
  remaining: Money;
  monthly_rate: Money | null;
  months_to_goal: number | null;
  projected_date: ISODate | null;
  on_track: boolean | null;
}

/** Compra a plazo que aporta a la deuda de la tarjeta en un estado de cuenta. */
export interface StatementInstallmentLine {
  id: UUID;
  description: string;
  installments_due: number;
  installments_total: number;
  amount_due: Money;
}

/** Estado de cuenta de una tarjeta de crédito -- ver `wallets/{id}/statement/`. */
export interface CreditCardStatement {
  cutoff_date: ISODate;
  next_cutoff_date: ISODate;
  payment_due_date: ISODate | null;
  spent: Money;
  paid: Money;
  installments_due: Money;
  /** Acumulado desde que existe la tarjeta: lo sin pagar de un corte anterior sigue apareciendo. */
  total_due: Money;
  /** Actividad del período abierto (desde el corte hasta la fecha consultada), aún no vencida. */
  current_period_spent: Money;
  current_period_paid: Money;
  installment_lines: StatementInstallmentLine[];
}

/** Fila del resumen `wallets/statements/` (todas las tarjetas del workspace). */
export interface CreditCardStatementSummary extends CreditCardStatement {
  wallet_id: UUID;
  wallet_name: string;
  currency: string;
  card_last4: string | null;
}

/**
 * Respaldo completo de un workspace (`workspaces/{id}/backup/`): carteras,
 * categorías, etiquetas, presupuestos, recurrentes, compras a plazo y
 * transacciones. El cliente nunca interpreta su contenido campo por campo
 * -- solo lo descarga como JSON y, más adelante, lo vuelve a mandar tal
 * cual a `workspaces/{id}/restore/`.
 */
export type WorkspaceBackup = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Errores DRF
// ---------------------------------------------------------------------------
/** Forma típica de un 400 de DRF: `{ campo: ["mensaje"], ... }` o `{ detail: "..." }`. */
export type DRFErrorBody =
  | { detail: string }
  | Record<string, string[] | string>;
