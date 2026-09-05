/**
 * Funciones tipadas por recurso del API v1. Una capa fina sobre `api` (axios);
 * los hooks de React Query viven en `@/api/queries`.
 *
 * Todas las llamadas (salvo las marcadas) van con `X-Workspace-ID` automático.
 */
import { api } from './client';
import type {
  BudgetReport,
  CashflowPoint,
  Category,
  CategoryBudget,
  CategoryBudgetInput,
  CategoryInput,
  ConfirmEmailImportInput,
  DashboardSummary,
  EmailImportLog,
  EmailImportStatus,
  InstallmentPurchase,
  InstallmentPurchaseInput,
  Membership,
  MonthlySnapshot,
  NetWorthBreakdown,
  NotificationPreferences,
  Paginated,
  PersonalAccessToken,
  RecurringExpense,
  RecurringExpenseInput,
  ScheduledItem,
  Transaction,
  TransactionInput,
  Wallet,
  WalletInput,
  WalletKind,
  WalletPurpose,
  Workspace,
  WorkspaceRole,
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
export type ResetScope = 'movimientos' | 'todo';

export const workspaces = {
  list: () => fetchAll<Workspace>('/workspaces/'),
  create: (name: string) =>
    api.post<Workspace>('/workspaces/', { name }, { skipWorkspace: true }).then((r) => r.data),
  /** Borra datos del workspace. Irreversible; solo owner. */
  reset: (id: string, scope: ResetScope) =>
    api
      .post<{ scope: ResetScope; deleted: Record<string, number> }>(
        `/workspaces/${id}/reset/`,
        { scope, confirm: true },
        { skipWorkspace: true },
      )
      .then((r) => r.data),
  /** Genera una dirección de importación nueva; invalida la anterior. Solo owner. */
  rotateInboundToken: (id: string) =>
    api
      .post<Workspace>(`/workspaces/${id}/rotate-inbound-token/`, {}, { skipWorkspace: true })
      .then((r) => r.data),
};

// --- miembros del workspace activo -----------------------------------------
export const memberships = {
  list: () => fetchAll<Membership>('/memberships/'),
  /** Invita por correo a alguien ya registrado en la app. Solo owner. */
  invite: (email: string, role: Exclude<WorkspaceRole, ''> = 'member') =>
    api.post<Membership>('/memberships/', { email, role }).then((r) => r.data),
  updateRole: (id: string, role: Exclude<WorkspaceRole, ''>) =>
    api.patch<Membership>(`/memberships/${id}/`, { role }).then((r) => r.data),
  remove: (id: string) => api.delete(`/memberships/${id}/`).then(() => undefined),
};

// --- tokens personales (Atajos de Apple Shortcuts) ----------------------
export const personalTokens = {
  list: () => fetchAll<PersonalAccessToken>('/personal-tokens/'),
  /** `token` en la respuesta trae el valor crudo — sólo esta vez. */
  create: (name: string, walletId: string) =>
    api
      .post<PersonalAccessToken>('/personal-tokens/', { name, wallet: walletId })
      .then((r) => r.data),
  remove: (id: string) => api.delete(`/personal-tokens/${id}/`).then(() => undefined),
};

// --- notificaciones push (sin X-Workspace-ID: son por usuario) --------
export const pushDevices = {
  register: (token: string, platform: 'ios' | 'android') =>
    api
      .post('/push-devices/', { token, platform }, { skipWorkspace: true })
      .then(() => undefined),
  unregister: (token: string) =>
    api
      .post('/push-devices/unregister/', { token }, { skipWorkspace: true })
      .then(() => undefined),
};

export const notificationPreferences = {
  get: () =>
    api
      .get<NotificationPreferences>('/notification-preferences/', { skipWorkspace: true })
      .then((r) => r.data),
  update: (input: Partial<NotificationPreferences>) =>
    api
      .patch<NotificationPreferences>('/notification-preferences/', input, { skipWorkspace: true })
      .then((r) => r.data),
};

// --- carteras (wallets) -------------------------------------------------
export interface WalletListParams {
  purpose?: WalletPurpose;
  kind?: WalletKind;
  is_active?: boolean;
  /** Omitido: solo activas. `true`: solo archivadas. `false`: solo no archivadas. */
  is_archived?: boolean;
}

export const wallets = {
  list: (params?: WalletListParams) => fetchAll<Wallet>('/wallets/', params),
  get: (id: string) => api.get<Wallet>(`/wallets/${id}/`).then((r) => r.data),
  create: (input: WalletInput) =>
    api.post<Wallet>('/wallets/', input).then((r) => r.data),
  update: (id: string, input: Partial<WalletInput>) =>
    api.patch<Wallet>(`/wallets/${id}/`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/wallets/${id}/`).then(() => undefined),
  archive: (id: string) =>
    api.post<Wallet>(`/wallets/${id}/archive/`).then((r) => r.data),
  unarchive: (id: string) =>
    api.post<Wallet>(`/wallets/${id}/unarchive/`).then((r) => r.data),
  /** Fija `sort_order` según el orden de `ids`. */
  reorder: (ids: string[]) =>
    api.post<{ reordered: number }>('/wallets/reorder/', { ids }).then((r) => r.data),
};

// --- categorías / presupuestos ------------------------------------------
export const categories = {
  list: () => fetchAll<Category>('/categories/'),
  create: (input: CategoryInput) =>
    api.post<Category>('/categories/', input).then((r) => r.data),
  update: (id: string, input: Partial<CategoryInput>) =>
    api.patch<Category>(`/categories/${id}/`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/categories/${id}/`).then(() => undefined),
  /** Categorías soft-deleted del workspace (array plano, sin paginar). */
  deleted: () => api.get<Category[]>('/categories/deleted/').then((r) => r.data),
  restore: (id: string) =>
    api.post<Category>(`/categories/${id}/restore/`).then((r) => r.data),
  /** Fija `sort_order` según el orden de `ids`. */
  reorder: (ids: string[]) =>
    api.post<{ reordered: number }>('/categories/reorder/', { ids }).then((r) => r.data),
};

export const categoryBudgets = {
  list: (params?: { year?: number; month?: number }) =>
    fetchAll<CategoryBudget>('/category-budgets/', params),
  create: (input: CategoryBudgetInput) =>
    api.post<CategoryBudget>('/category-budgets/', input).then((r) => r.data),
  update: (id: string, input: Partial<CategoryBudgetInput>) =>
    api.patch<CategoryBudget>(`/category-budgets/${id}/`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/category-budgets/${id}/`).then(() => undefined),
};

// --- recurrentes -------------------------------------------------------
export const recurringExpenses = {
  list: () => fetchAll<RecurringExpense>('/recurring-expenses/'),
  get: (id: string) =>
    api.get<RecurringExpense>(`/recurring-expenses/${id}/`).then((r) => r.data),
  create: (input: RecurringExpenseInput) =>
    api.post<RecurringExpense>('/recurring-expenses/', input).then((r) => r.data),
  update: (id: string, input: Partial<RecurringExpenseInput>) =>
    api.patch<RecurringExpense>(`/recurring-expenses/${id}/`, input).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/recurring-expenses/${id}/`).then(() => undefined),
};

// --- compras a plazo (cuotas) ----------------------------------------
export const installments = {
  list: () => fetchAll<InstallmentPurchase>('/installment-purchases/'),
  get: (id: string) =>
    api.get<InstallmentPurchase>(`/installment-purchases/${id}/`).then((r) => r.data),
  create: (input: InstallmentPurchaseInput) =>
    api.post<InstallmentPurchase>('/installment-purchases/', input).then((r) => r.data),
  update: (id: string, input: Partial<InstallmentPurchaseInput>) =>
    api.patch<InstallmentPurchase>(`/installment-purchases/${id}/`, input).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/installment-purchases/${id}/`).then(() => undefined),
  /** Registra la siguiente cuota (crea la transacción). */
  pay: (id: string) =>
    api.post<InstallmentPurchase>(`/installment-purchases/${id}/pay/`).then((r) => r.data),
};

// --- transacciones -----------------------------------------------------
export interface TransactionListParams {
  date_after?: string;
  date_before?: string;
  type?: 'income' | 'expense' | 'transfer';
  wallet?: string;
  to_wallet?: string;
  category?: string;
  source?: string;
  counts_toward_budget?: boolean;
  /** Coincidencia parcial en descripción, categoría o cartera. */
  search?: string;
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

  /**
   * Sube (o reemplaza) la foto del recibo. `uri` es la que devuelve el
   * picker/cámara — se re-lee con `fetch` para obtener un Blob real: es lo
   * único que funciona igual en RN (uri `file://`) y en web (uri `blob:`
   * o `data:`), a diferencia del objeto `{uri,name,type}` que sólo entiende
   * el FormData de RN nativo.
   */
  uploadReceipt: async (id: string, file: { uri: string; name: string; type: string }) => {
    const blob = await fetch(file.uri).then((r) => r.blob());
    const form = new FormData();
    form.append('file', blob, file.name);
    return api
      .post<Transaction>(`/transactions/${id}/receipt/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  removeReceipt: (id: string) => api.delete(`/transactions/${id}/receipt/`).then(() => undefined),

  /** Bytes crudos + content-type, para armar un data URI y mostrarlo en <Image>
   * (el endpoint exige el mismo auth que el resto del API — un <Image
   * source={{uri}}> directo no podría mandar el header Authorization). */
  getReceiptBlob: (id: string) =>
    api
      .get<ArrayBuffer>(`/transactions/${id}/receipt/`, { responseType: 'arraybuffer' })
      .then((r) => ({
        data: r.data,
        contentType: (r.headers['content-type'] as string | undefined) ?? 'image/jpeg',
      })),
};

// --- snapshots mensuales (solo lectura) -------------------------------
export const monthlySnapshots = {
  list: () => fetchAll<MonthlySnapshot>('/monthly-snapshots/'),
};

// --- bandeja de importación bancaria por correo -----------------------
export const emailImportLogs = {
  /** Sin `status`: todo el historial. `?status=pending` para la bandeja. */
  list: (status?: EmailImportStatus) =>
    fetchAll<EmailImportLog>('/email-import-logs/', status ? { status } : {}),
  get: (id: string) => api.get<EmailImportLog>(`/email-import-logs/${id}/`).then((r) => r.data),
  /** Aprueba la candidata y crea la Transaction. */
  confirm: (id: string, input: ConfirmEmailImportInput) =>
    api.post<EmailImportLog>(`/email-import-logs/${id}/confirm/`, input).then((r) => r.data),
  reject: (id: string) =>
    api.post<EmailImportLog>(`/email-import-logs/${id}/reject/`).then((r) => r.data),
};

// --- reportes (agregaciones) -----------------------------------------
export const reports = {
  netWorth: () => api.get<NetWorthBreakdown>('/reports/net-worth/').then((r) => r.data),

  summary: () => api.get<DashboardSummary>('/reports/summary/').then((r) => r.data),

  budget: (params?: { year?: number; month?: number }) =>
    api.get<BudgetReport>('/reports/budget/', { params }).then((r) => r.data),

  cashflow: (months = 6) =>
    api.get<CashflowPoint[]>('/reports/cashflow/', { params: { months } }).then((r) => r.data),

  /** Recurrentes + cuotas próximas, sin materializarlas. Fechas ISO. */
  scheduled: (params?: { since?: string; until?: string }) =>
    api.get<ScheduledItem[]>('/reports/scheduled/', { params }).then((r) => r.data),
};
