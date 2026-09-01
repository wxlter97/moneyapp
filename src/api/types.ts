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
// Cuentas / patrimonio
// ---------------------------------------------------------------------------
export type AccountType = 'checking' | 'savings' | 'credit' | 'cash';
export type Visibility = 'shared' | 'private';

export interface Account {
  id: UUID;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: Money;
  current_balance: Money;
  visibility: Visibility;
  owner: number | null;
  card_last4: string | null;
  billing_cycle_day: number | null;
  payment_due_day: number | null;
  is_active: boolean;
  is_default: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Asset {
  id: UUID;
  name: string;
  type: string;
  current_value: Money;
  visibility: Visibility;
  owner: number | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Liability {
  id: UUID;
  name: string;
  type: string;
  total_amount: Money;
  remaining_amount: Money;
  interest_rate: string | null;
  due_date: ISODate | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type DebtDirection = 'a_favor' | 'en_contra';

export interface Debt {
  id: UUID;
  direction: DebtDirection;
  person: string;
  amount: Money;
  description: string;
  is_settled: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
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
  account: UUID;
  /** Solo transferencias: cuenta destino. */
  to_account: UUID | null;
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
 * - transfer: `type: 'transfer'` + `to_account`; sin categoría.
 */
export interface TransactionInput {
  type?: TransactionType;
  account: UUID;
  to_account?: UUID | null;
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
  accounts: Money;
  assets: Money;
  liabilities: Money;
  debts_owed_to_us: Money;
  debts_we_owe: Money;
  net: Money;
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
