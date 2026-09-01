/**
 * Funciones tipadas por recurso del API v1. Una capa fina sobre `api` (axios);
 * los hooks de React Query viven en `@/api/queries`.
 *
 * Todas las llamadas (salvo las marcadas) van con `X-Workspace-ID` automático.
 */
import { api } from './client';
import type {
  Account,
  Asset,
  BudgetReport,
  CashflowPoint,
  Category,
  CategoryBudget,
  DashboardSummary,
  Debt,
  Liability,
  MonthlySnapshot,
  NetWorthBreakdown,
  Paginated,
  Transaction,
  TransactionInput,
  Workspace,
} from './types';

// --- paginación --------------------------------------------------------------
const PAGE_LIMIT = 100;

/** Sigue `next` hasta agotar la colección. Úsalo con criterio en listas grandes. */
async function fetchAll<T>(path: string, params: object = {}): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await api.get<Paginated<T>>(path, {
      params: { ...params, limit: PAGE_LIMIT, offset },
    });
    out.push(...data.results);
    if (!data.next || data.results.length === 0) break;
    offset += PAGE_LIMIT;
  }
  return out;
}

// --- workspaces (sin X-Workspace-ID) ---------------------------------------
export const workspaces = {
  list: () => fetchAll<Workspace>('/workspaces/'),
  create: (name: string) =>
    api.post<Workspace>('/workspaces/', { name }, { skipWorkspace: true }).then((r) => r.data),
};

// --- cuentas / patrimonio -------------------------------------------------
export const accounts = {
  list: () => fetchAll<Account>('/accounts/'),
};
export const assets = {
  list: () => fetchAll<Asset>('/assets/'),
};
export const liabilities = {
  list: () => fetchAll<Liability>('/liabilities/'),
};
export const debts = {
  list: () => fetchAll<Debt>('/debts/'),
};

// --- categorías / presupuestos ------------------------------------------
export const categories = {
  list: () => fetchAll<Category>('/categories/'),
};

export const categoryBudgets = {
  list: (params?: { year?: number; month?: number }) =>
    fetchAll<CategoryBudget>('/category-budgets/', params),
};

// --- transacciones -----------------------------------------------------
export interface TransactionListParams {
  /** Filtros por fecha. Requieren django-filter en el backend (ver README). */
  date_after?: string;
  date_before?: string;
  account?: string;
  category?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export const transactions = {
  /** Página cruda (para scroll infinito). */
  page: (params: TransactionListParams = {}) =>
    api.get<Paginated<Transaction>>('/transactions/', { params }).then((r) => r.data),

  /** Toda la colección que cumple el filtro. */
  list: (params: TransactionListParams = {}) =>
    fetchAll<Transaction>('/transactions/', params),

  get: (id: string) => api.get<Transaction>(`/transactions/${id}/`).then((r) => r.data),

  create: (input: TransactionInput) =>
    api.post<Transaction>('/transactions/', input).then((r) => r.data),

  update: (id: string, input: Partial<TransactionInput>) =>
    api.patch<Transaction>(`/transactions/${id}/`, input).then((r) => r.data),

  remove: (id: string) => api.delete(`/transactions/${id}/`).then(() => undefined),
};

// --- snapshots mensuales (solo lectura) -------------------------------
export const monthlySnapshots = {
  list: () => fetchAll<MonthlySnapshot>('/monthly-snapshots/'),
};

// --- reportes (agregaciones) -----------------------------------------
export const reports = {
  netWorth: () => api.get<NetWorthBreakdown>('/reports/net-worth/').then((r) => r.data),

  summary: () => api.get<DashboardSummary>('/reports/summary/').then((r) => r.data),

  budget: (params?: { year?: number; month?: number }) =>
    api.get<BudgetReport>('/reports/budget/', { params }).then((r) => r.data),

  cashflow: (months = 6) =>
    api.get<CashflowPoint[]>('/reports/cashflow/', { params: { months } }).then((r) => r.data),
};
