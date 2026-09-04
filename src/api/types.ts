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
  inbound_token: string;
  inbound_email: string;
  created_at: ISODateTime;
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
  | 'installment';

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
  /** Si false, el gasto no cuenta contra el presupuesto de su categoría. */
  counts_toward_budget: boolean;
  source: TransactionSource;
  is_recurring: boolean;
  created_by: number | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
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
  category: UUID;
  description: string;
  total_amount: Money;
  installment_amount: Money;
  installments_total: number;
  installments_paid: number;
  start_date: ISODate;
  is_completed: boolean;
  /** installment_amount × (total − pagadas). */
  remaining_amount: Money;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface InstallmentPurchaseInput {
  wallet: UUID;
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
// Reportes (agregaciones, solo lectura, workspace del header)
// ---------------------------------------------------------------------------
export interface NetWorthBreakdown {
  net: Money;
  by_purpose: Record<WalletPurpose, Money>;
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
  pending_email_imports: number;
  top_expense_categories: SpendRow[];
}

// ---------------------------------------------------------------------------
// Errores DRF
// ---------------------------------------------------------------------------
/** Forma típica de un 400 de DRF: `{ campo: ["mensaje"], ... }` o `{ detail: "..." }`. */
export type DRFErrorBody =
  | { detail: string }
  | Record<string, string[] | string>;
