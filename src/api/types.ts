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

export interface Wallet {
  id: UUID;
  name: string;
  purpose: WalletPurpose;
  parent: UUID | null;
  currency: string;
  opening_balance: Money;
  /** Saldo propio (sin hijos). */
  current_balance: Money;
  /** Saldo propio + el de los descendientes. */
  aggregated_balance: Money;
  counts_toward_net_worth: boolean;
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
  is_default: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Payload de alta/edición de cartera. */
export interface WalletInput {
  name: string;
  purpose: WalletPurpose;
  parent?: UUID | null;
  currency?: string;
  opening_balance?: Money;
  counts_toward_net_worth?: boolean;
  goal_amount?: Money | null;
  goal_date?: ISODate | null;
  monthly_contribution?: Money | null;
  card_last4?: string | null;
  interest_rate?: string | null;
  due_date?: ISODate | null;
  counterparty?: string;
  visibility?: Visibility;
  is_active?: boolean;
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
  parent: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
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

export interface BudgetReport {
  year: number;
  month: number;
  rows: BudgetRow[];
  totals: { budgeted: Money; spent: Money; remaining: Money };
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
