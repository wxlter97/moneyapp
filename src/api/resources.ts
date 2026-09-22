/**
 * Funciones tipadas por recurso del API v1. Una capa fina sobre `api` (axios);
 * los hooks de React Query viven en `@/api/queries`.
 *
 * Todas las llamadas (salvo las marcadas) van con `X-Workspace-ID` automático.
 */
import { api } from './client';
import type {
  AIStatus,
  AppNotification,
  Bank,
  BankEmailSchema,
  BudgetPeriod,
  BudgetReport,
  CardProduct,
  CashflowPoint,
  Category,
  CategoryBudget,
  CategoryBudgetInput,
  CategoryInput,
  CategoryTrendsResponse,
  CheckoutResult,
  ConfirmEmailImportInput,
  CreditCardStatement,
  CreditCardStatementSummary,
  DashboardSummary,
  EmailImportLog,
  EmailImportStatus,
  ExchangeRate,
  GamificationSummary,
  GoalProjection,
  InstallmentPurchase,
  InstallmentPurchaseInput,
  Invitation,
  LoyaltyCategoryType,
  LoyaltyEarningRow,
  LoyaltyMerchant,
  LoyaltyMovement,
  LoyaltyMovementInput,
  PushTestResponse,
  LoyaltySummary,
  Membership,
  ModuleFlagsStatus,
  Money,
  ChatAnswer,
  MonthlySnapshot,
  MyPlan,
  NetWorthBreakdown,
  NotificationPreferences,
  Paginated,
  Person,
  PersonalAccessToken,
  PersonBalance,
  Plan,
  ParseCandidate,
  ReceiptCandidate,
  RecurringExpense,
  RecurringExpenseInput,
  RecurringSuggestion,
  RegisterRefundInput,
  SavingsInterestProjection,
  ScheduledItem,
  SetForwardBudgetInput,
  SetForwardBudgetResult,
  SplitPeopleInput,
  Subscription,
  SupportTicket,
  SupportTicketInput,
  SupportTicketStatus,
  SupportTicketType,
  Tag,
  TagSummary,
  Transaction,
  TransactionTotals,
  TransactionImportResult,
  TransactionInput,
  TransactionSplitPart,
  Wallet,
  WalletInput,
  WalletKind,
  WalletPurpose,
  Workspace,
  WorkspaceBackup,
  WorkspaceRole,
} from './types';

// --- paginación --------------------------------------------------------------
const PAGE_LIMIT = 100;

/** Sigue `next` hasta agotar la colección. Úsalo con criterio en listas grandes. */
async function fetchAll<T>(path: string, params: object = {}): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
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
  /** Moneda de los totales agregados (patrimonio, presupuesto, flujo). Solo owner. */
  setBaseCurrency: (id: string, base_currency: string) =>
    api
      .patch<Workspace>(`/workspaces/${id}/`, { base_currency }, { skipWorkspace: true })
      .then((r) => r.data),
  /** Cadencia del presupuesto (diario/semanal/quincenal/mensual/anual). Solo owner. */
  setBudgetPeriod: (id: string, budget_period: BudgetPeriod) =>
    api
      .patch<Workspace>(`/workspaces/${id}/`, { budget_period }, { skipWorkspace: true })
      .then((r) => r.data),
  /** Renombra el presupuesto. Solo owner. */
  rename: (id: string, name: string) =>
    api.patch<Workspace>(`/workspaces/${id}/`, { name }, { skipWorkspace: true }).then((r) => r.data),
  /** Borra el presupuesto (soft delete). Solo owner; el backend rechaza
   * borrar el único presupuesto del usuario. */
  remove: (id: string) =>
    api.delete(`/workspaces/${id}/`, { skipWorkspace: true }).then(() => undefined),
  /** Respaldo completo en JSON (carteras, categorías, etiquetas, presupuestos,
   * recurrentes, compras a plazo y transacciones). Solo owner.
   * Timeout más largo que el default (20s): con miles de movimientos, tanto
   * generar como restaurar el respaldo puede tardar más que una request
   * interactiva normal, sin que eso signifique que se colgó. */
  backup: (id: string) =>
    api
      .get<WorkspaceBackup>(`/workspaces/${id}/backup/`, { skipWorkspace: true, timeout: 120_000 })
      .then((r) => r.data),
  /** Reemplaza TODO el contenido del workspace por el de `backup`. Irreversible; solo owner. */
  restore: (id: string, backup: WorkspaceBackup) =>
    api
      .post<{ restored: Record<string, number> }>(
        `/workspaces/${id}/restore/`,
        { ...backup, confirm: true },
        { skipWorkspace: true, timeout: 120_000 },
      )
      .then((r) => r.data),
};

// --- tasas de cambio (workspace activo) ------------------------------
export const exchangeRates = {
  list: () => fetchAll<ExchangeRate>('/exchange-rates/'),
  /** Upsert: cargar una moneda ya configurada actualiza su tasa. */
  set: (currency: string, rate_to_base: string) =>
    api.post<ExchangeRate>('/exchange-rates/', { currency, rate_to_base }).then((r) => r.data),
  remove: (id: string) => api.delete(`/exchange-rates/${id}/`).then(() => undefined),
};

// --- miembros del workspace activo -----------------------------------------
export const memberships = {
  list: () => fetchAll<Membership>('/memberships/'),
  /**
   * Invita por correo. Si ya hay una cuenta con ese correo, la respuesta es
   * un Membership (201, entra directo). Si no, es una Invitation (202): se
   * le mandó un correo con el enlace para sumarse en cuanto tenga cuenta.
   * `isInvitation` distingue una respuesta de otra.
   */
  invite: (email: string, role: Exclude<WorkspaceRole, ''> = 'member') =>
    api.post<Membership | Invitation>('/memberships/', { email, role }).then((r) => r.data),
  updateRole: (id: string, role: Exclude<WorkspaceRole, ''>) =>
    api.patch<Membership>(`/memberships/${id}/`, { role }).then((r) => r.data),
  remove: (id: string) => api.delete(`/memberships/${id}/`).then(() => undefined),
};

export function isInvitation(x: Membership | Invitation): x is Invitation {
  return 'status' in x && 'token' in x;
}

// --- invitaciones a MI (por mi correo, sin workspace todavía) --------------
export const invitations = {
  /** Mis invitaciones pendientes, en cualquier workspace. */
  mine: () => fetchAll<Invitation>('/invitations/', {}),
  /** Vista pública por token -- para abrir el enlace del correo sin sesión. */
  preview: (token: string) =>
    api.get<Invitation>(`/invitations/${token}/`, { skipWorkspace: true }).then((r) => r.data),
  accept: (token: string) =>
    api
      .post<Invitation>(`/invitations/${token}/accept/`, {}, { skipWorkspace: true })
      .then((r) => r.data),
  decline: (token: string) =>
    api
      .post<Invitation>(`/invitations/${token}/decline/`, {}, { skipWorkspace: true })
      .then((r) => r.data),
};

// --- catálogo de bancos soportados por el importador (global, no por workspace) --
export const bankEmailSchemas = {
  list: () => fetchAll<BankEmailSchema>('/bank-email-schemas/', {}),
};

// --- catálogo de lealtad (global, no por workspace; solo lectura acá) -----
export const loyaltyBanks = {
  list: () => fetchAll<Bank>('/banks/', {}),
};

export const loyaltyCategoryTypes = {
  list: () => fetchAll<LoyaltyCategoryType>('/category-types/', {}),
};

export const loyaltyMerchants = {
  list: () => fetchAll<LoyaltyMerchant>('/loyalty-merchants/', {}),
};

export const cardProducts = {
  list: () => fetchAll<CardProduct>('/card-products/', {}),
};

// --- lo generado por transacciones según los programas de lealtad ---------
export const loyaltyMovements = {
  list: (params?: { wallet?: string; program?: string; kind?: string }) =>
    fetchAll<LoyaltyMovement>('/loyalty-movements/', params ?? {}),
  create: (input: LoyaltyMovementInput) =>
    api.post<LoyaltyMovement>('/loyalty-movements/', input).then((r) => r.data),
  /** Sólo nota, fecha y (en un ajuste) la cantidad: un canje se deshace y se rehace. */
  update: (id: string, input: { quantity?: string; date?: string; note?: string }) =>
    api.patch<LoyaltyMovement>(`/loyalty-movements/${id}/`, input).then((r) => r.data),
  /** Deshace el movimiento; si era un canje depositado, también borra su ingreso. */
  remove: (id: string) => api.delete(`/loyalty-movements/${id}/`).then(() => undefined),
};

export const loyaltyEarnings = {
  /** Lo que ganó cada compra de una cartera (más reciente primero). */
  list: (params?: { wallet?: string }) => fetchAll<LoyaltyEarningRow>('/loyalty-earnings/', params ?? {}),
  /** Saldo de puntos por cartera + cashback ganado / descuento ahorrado en
   * el período (ambas fechas opcionales, formato ISO). */
  summary: (params?: { date_after?: string; date_before?: string }) =>
    api.get<LoyaltySummary>('/loyalty-earnings/summary/', { params }).then((r) => r.data),
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
  /** `keys` sólo aplica (y es requerido por el backend) para
   * `platform: 'web'` -- las claves p256dh/auth de la PushSubscription del
   * navegador, sin las cuales no se puede cifrar el payload (RFC 8291). */
  register: (
    token: string,
    platform: 'ios' | 'android' | 'web',
    keys?: { p256dh: string; auth: string },
  ) =>
    api
      .post('/push-devices/', { token, platform, ...keys }, { skipWorkspace: true })
      .then(() => undefined),
  unregister: (token: string) =>
    api
      .post('/push-devices/unregister/', { token }, { skipWorkspace: true })
      .then(() => undefined),
  /** Manda un aviso de prueba a todos los dispositivos de la cuenta y dice qué pasó
   * con cada uno (entregado, rechazado con su código, suscripción vencida…). */
  test: () =>
    api
      .post<PushTestResponse>('/push-devices/test/', {}, { skipWorkspace: true })
      .then((r) => r.data),
  /** Clave pública VAPID para `PushManager.subscribe({applicationServerKey})`
   * -- pública por diseño, no requiere sesión. */
  vapidPublicKey: () =>
    api
      .get<{ vapid_public_key: string }>('/push-devices/vapid-public-key/', {
        skipWorkspace: true,
      })
      .then((r) => r.data.vapid_public_key),
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

// --- centro de notificaciones (sin X-Workspace-ID: es por usuario) ----
export const notifications = {
  /** Historial completo -- incluye resueltas, no sólo pendientes. */
  list: () => fetchAll<AppNotification>('/notifications/', {}),
  unreadCount: () =>
    api
      .get<{ count: number }>('/notifications/unread-count/', { skipWorkspace: true })
      .then((r) => r.data.count),
  markRead: (id: string) =>
    api
      .post<AppNotification>(`/notifications/${id}/read/`, {}, { skipWorkspace: true })
      .then((r) => r.data),
  markAllRead: () =>
    api
      .post<{ updated: number }>('/notifications/mark-all-read/', {}, { skipWorkspace: true })
      .then((r) => r.data),
};

// --- pagos y suscripciones (sin X-Workspace-ID: son por usuario) ------
export interface CheckoutInput {
  plan_price: string;
  /** Proveedor a usar; sin especificar, el backend usa el default. */
  provider?: string;
  success_url: string;
  cancel_url: string;
}

export const plans = {
  /** Catálogo de planes + precios activos -- nunca hardcodear nombre,
   * límites ni precio en el cliente, vienen de acá. */
  list: () => fetchAll<Plan>('/plans/'),
};

export const billing = {
  /** Plan efectivo del usuario autenticado + su suscripción vigente (o
   * `subscription: null` si está en el plan gratis). */
  me: () => api.get<MyPlan>('/billing/me/', { skipWorkspace: true }).then((r) => r.data),
  /** Arranca el checkout de un precio; `checkout_url` es a dónde redirigir
   * al usuario para completarlo con el proveedor de pago. */
  checkout: (input: CheckoutInput) =>
    api.post<CheckoutResult>('/billing/checkout/', input, { skipWorkspace: true }).then((r) => r.data),
  /** Cancela la suscripción vigente. Sigue activa hasta que termine el
   * período ya pagado (el proveedor no reembolsa el resto). */
  cancel: () =>
    api.post<Subscription>('/billing/cancel/', {}, { skipWorkspace: true }).then((r) => r.data),
  /** Canjea un código de invitación: acceso gratis a un plan, sin pasar por
   * el proveedor de pago. Un solo canje por usuario en toda su vida. */
  redeem: (code: string) =>
    api.post<Subscription>('/billing/redeem/', { code }, { skipWorkspace: true }).then((r) => r.data),
  /** Arranca la prueba gratis de un plan (`plan.trial_days`), sin código ni
   * proveedor de pago. Una sola prueba por usuario en toda su vida. */
  startTrial: (planId: string) =>
    api
      .post<Subscription>('/billing/trial/', { plan: planId }, { skipWorkspace: true })
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
  /** Solo tiene sentido en una cartera de ahorro con meta -- 404 si no. */
  projection: (id: string) =>
    api.get<GoalProjection>(`/wallets/${id}/projection/`).then((r) => r.data),
  /** Solo tiene sentido en una tarjeta de crédito con fecha de corte -- 404 si no. */
  statement: (id: string, asOf?: string) =>
    api
      .get<CreditCardStatement>(`/wallets/${id}/statement/`, { params: asOf ? { as_of: asOf } : undefined })
      .then((r) => r.data),
  /** Estado de cuenta de todas las tarjetas de crédito del workspace, a hoy. */
  statements: () =>
    api.get<CreditCardStatementSummary[]>('/wallets/statements/').then((r) => r.data),
  /** Solo tiene sentido en una cartera de ahorro con tasa configurada -- 404 si no.
   * `year`/`month` por defecto el mes en curso. */
  interestProjection: (id: string, year?: number, month?: number) =>
    api
      .get<SavingsInterestProjection>(`/wallets/${id}/interest-projection/`, {
        params: year && month ? { year, month } : undefined,
      })
      .then((r) => r.data),
  /** Convierte esta cartera en un grupo: crea una cuenta nueva (hija) con
   * `name` y le pasa todo lo propio (saldo, movimientos, recurrentes,
   * compras a plazo) -- la cartera original queda en 0, agrupando. */
  split: (id: string, name: string) =>
    api
      .post<{ parent: Wallet; child: Wallet }>(`/wallets/${id}/split/`, { name })
      .then((r) => r.data),
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
  /** Borrado definitivo de una categoría ya eliminada (soft-delete) --
   * sólo para vaciar "Eliminadas". */
  purge: (id: string) => api.delete(`/categories/${id}/purge/`).then(() => undefined),
  /** Fija `sort_order` según el orden de `ids`. */
  reorder: (ids: string[]) =>
    api.post<{ reordered: number }>('/categories/reorder/', { ids }).then((r) => r.data),
};

export const tags = {
  list: () => fetchAll<Tag>('/tags/'),
  create: (name: string) => api.post<Tag>('/tags/', { name }).then((r) => r.data),
  update: (id: string, name: string) =>
    api.patch<Tag>(`/tags/${id}/`, { name }).then((r) => r.data),
  remove: (id: string) => api.delete(`/tags/${id}/`).then(() => undefined),
  /** Ingresos/gastos/cantidad acumulados por etiqueta. */
  summary: () => api.get<TagSummary[]>('/tags/summary/').then((r) => r.data),
};

export const categoryBudgets = {
  list: (params?: { period_start?: string }) =>
    fetchAll<CategoryBudget>('/category-budgets/', params),
  create: (input: CategoryBudgetInput) =>
    api.post<CategoryBudget>('/category-budgets/', input).then((r) => r.data),
  update: (id: string, input: Partial<CategoryBudgetInput>) =>
    api.patch<CategoryBudget>(`/category-budgets/${id}/`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/category-budgets/${id}/`).then(() => undefined),
  /** Fija el monto de un período y lo propaga hacia adelante (ver tipo). */
  setForward: (input: SetForwardBudgetInput) =>
    api
      .post<SetForwardBudgetResult>('/category-budgets/set-forward/', input)
      .then((r) => r.data),
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
  /** Candidatas detectadas en el historial ("esto parece recurrente"). */
  suggestions: () =>
    api.get<RecurringSuggestion[]>('/recurring-expenses/suggestions/').then((r) => r.data),
  /** "No, gracias" a una sugerencia -- no se le vuelve a mostrar. */
  dismissSuggestion: (category: string, wallet: string, amount: Money) =>
    api
      .post('/recurring-expenses/dismiss-suggestion/', { category, wallet, amount })
      .then(() => undefined),
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
  /** ID de una etiqueta. */
  tag?: string;
  amount_min?: number;
  amount_max?: number;
  limit?: number;
  offset?: number;
}

export const transactions = {
  /** Página cruda (para scroll infinito). */
  page: (params: TransactionListParams = {}) =>
    api.get<Paginated<Transaction>>('/transactions/', { params }).then((r) => r.data),

  /** Ingresos y gastos que cumplen el filtro (todo, no sólo lo cargado), por moneda. */
  totals: (params: TransactionListParams = {}) =>
    api
      .get<TransactionTotals[]>('/transactions/totals/', { params })
      .then((r) => r.data),

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

  /** Reemplaza la transacción por N partes (cada una con su categoría y
   * monto propios) que tienen que sumar exactamente el monto original. */
  split: (id: string, parts: TransactionSplitPart[]) =>
    api.post<Transaction[]>(`/transactions/${id}/split/`, { parts }).then((r) => r.data),

  /** Divide esta transacción entre varias personas (reemplaza cualquier
   * división anterior de la misma transacción). */
  splitPeople: (id: string, input: SplitPeopleInput) =>
    api.post<Transaction>(`/transactions/${id}/split-people/`, input).then((r) => r.data),

  /** Marca (o desmarca) como liquidada la parte de una persona. */
  settleShare: (id: string, shareId: string, isSettled: boolean) =>
    api
      .post<Transaction>(`/transactions/${id}/settle-share/${shareId}/`, { is_settled: isSettled })
      .then((r) => r.data),

  /** Crea la transacción de ingreso real que devuelve la plata de este
   * gasto y lo marca `is_refunded` (ver `Transaction.is_refunded`). Devuelve
   * esa nueva transacción, no la original. */
  registerRefund: (id: string, input: RegisterRefundInput) =>
    api.post<Transaction>(`/transactions/${id}/register-refund/`, input).then((r) => r.data),

  /** Quién le debe cuánto a quién en el workspace activo. */
  balances: () => api.get<PersonBalance[]>('/transactions/balances/').then((r) => r.data),

  /** Salda de una sola vez toda la deuda pendiente entre estas dos personas
   * (en cualquier dirección) -- devuelve los saldos ya actualizados. */
  settleBalance: (fromPersonId: string, toPersonId: string) =>
    api
      .post<PersonBalance[]>('/transactions/settle-balance/', {
        from_person: fromPersonId,
        to_person: toPersonId,
      })
      .then((r) => r.data),

  /** Transacciones existentes que podrían ser la misma que se está por
   * cargar a mano -- no bloquea nada, sólo informa (ver TransactionForm). */
  checkDuplicate: (params: { wallet: string; amount: Money; date: string; exclude?: string }) =>
    api.get<Transaction[]>('/transactions/check-duplicate/', { params }).then((r) => r.data),

  /** Bytes del .xlsx de la plantilla (con las carteras/categorías reales del
   * workspace ya cargadas como referencia), para descargarlo. */
  importTemplate: () =>
    api
      .get<ArrayBuffer>('/transactions/import-template/', { responseType: 'arraybuffer' })
      .then((r) => r.data),

  /** Sube la plantilla ya llena: crea todo lo que se pueda y reporta el
   * resto fila por fila (ver `TransactionImportResult`) -- una fila con
   * error no frena a las demás. */
  importXlsx: (file: File) => {
    const form = new FormData();
    form.append('file', file, file.name);
    return api
      .post<TransactionImportResult>('/transactions/import/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

// --- gente con la que se dividen transacciones -------------------------
export const people = {
  list: () => fetchAll<Person>('/people/'),
  create: (name: string) => api.post<Person>('/people/', { name }).then((r) => r.data),
  remove: (id: string) => api.delete(`/people/${id}/`).then(() => undefined),
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
  /** Limpia (soft-delete) el historial de correos "no reconocidos". */
  clearFailed: () =>
    api.post<{ cleared: number }>('/email-import-logs/clear-failed/').then((r) => r.data),
};

// --- reportes (agregaciones) -----------------------------------------
export const reports = {
  netWorth: () => api.get<NetWorthBreakdown>('/reports/net-worth/').then((r) => r.data),

  summary: () => api.get<DashboardSummary>('/reports/summary/').then((r) => r.data),

  budget: (params?: { period_start?: string }) =>
    api.get<BudgetReport>('/reports/budget/', { params }).then((r) => r.data),

  cashflow: (months = 6) =>
    api.get<CashflowPoint[]>('/reports/cashflow/', { params: { months } }).then((r) => r.data),

  /** Gasto por categoría mes a mes + cuáles crecieron más. */
  categoryTrends: (months = 6) =>
    api
      .get<CategoryTrendsResponse>('/reports/category-trends/', { params: { months } })
      .then((r) => r.data),

  /** Recurrentes + cuotas próximas, sin materializarlas. Fechas ISO. */
  scheduled: (params?: { since?: string; until?: string }) =>
    api.get<ScheduledItem[]>('/reports/scheduled/', { params }).then((r) => r.data),
};

// --- soporte (reportar errores, consultas, sugerencias) -----------------
export interface SupportTicketListParams {
  status?: SupportTicketStatus;
  type?: SupportTicketType;
}

export const supportTickets = {
  list: (params: SupportTicketListParams = {}) =>
    fetchAll<SupportTicket>('/support-tickets/', params),
  get: (id: string) => api.get<SupportTicket>(`/support-tickets/${id}/`).then((r) => r.data),
  create: (input: SupportTicketInput) =>
    api.post<SupportTicket>('/support-tickets/', input).then((r) => r.data),
  /** Agrega un mensaje del usuario al hilo (p. ej. más contexto después de abrirlo). */
  reply: (id: string, message: string) =>
    api.post<SupportTicket>(`/support-tickets/${id}/reply/`, { message }).then((r) => r.data),
};

// --- gamificación (racha, badges) ---------------------------------------
export const gamification = {
  summary: () => api.get<GamificationSummary>('/gamification/summary/').then((r) => r.data),
};

// --- IA (disponibilidad y cuota) ----------------------------------------
export const ai = {
  /** No lleva workspace: la cuota es del usuario, no del presupuesto — quien
   * paga es el dueño del plan y la misma cuota se gasta desde cualquiera de
   * sus workspaces. */
  status: () => api.get<AIStatus>('/ai/status/', { skipWorkspace: true }).then((r) => r.data),

  /**
   * Manda el recibo a leer y devuelve una candidata editable. **No crea la
   * transacción ni guarda el archivo**: eso pasa después, por los endpoints
   * de siempre, cuando el usuario confirma.
   *
   * El `fetch(uri)` para sacar un Blob es el mismo truco que `uploadReceipt`
   * — es lo único que funciona igual en nativo (`file://`) y en web
   * (`blob:`/`data:`).
   *
   * `wallet` es opcional y sirve para que la respuesta traiga los posibles
   * duplicados de esa cartera.
   */
  scanReceipt: async (file: { uri: string; name: string; type: string }, wallet?: string | null) => {
    const blob = await fetch(file.uri).then((r) => r.blob());
    const form = new FormData();
    form.append('file', blob, file.name);
    if (wallet) form.append('wallet', wallet);
    return api
      .post<ReceiptCandidate>('/ai/receipt/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** Igual que `scanReceipt` pero desde una frase ("gasté 12.50 en almuerzo
   * con la tarjeta"). Devuelve candidata, no transacción. */
  parseText: (text: string, wallet?: string | null) =>
    api
      .post<ParseCandidate>('/ai/parse/', { text, ...(wallet ? { wallet } : {}) })
      .then((r) => r.data),

  /** Igual que `parseText` pero desde un dictado -- mismo `fetch(uri)` que
   * `scanReceipt` para sacar el Blob, mismo contrato de respuesta. Comparte
   * la cuota de `parse` con el texto libre: no es una operación aparte, es la
   * misma entrada por otro canal. */
  parseVoice: async (file: { uri: string; name: string; type: string }, wallet?: string | null) => {
    const blob = await fetch(file.uri).then((r) => r.blob());
    const form = new FormData();
    form.append('file', blob, file.name);
    if (wallet) form.append('wallet', wallet);
    return api
      .post<ParseCandidate>('/ai/voice/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** Pregunta sobre las finanzas del workspace activo. La IA elige una
   * función de reportes ya existente y sólo redacta con lo que devuelve --
   * ver `apps.ai.chat` en el backend. Cuenta contra `quotas.chat`. */
  chat: (question: string) => api.post<ChatAnswer>('/ai/chat/', { question }).then((r) => r.data),
};

// --- interruptores de módulos (kill switch manual, ver `useModuleFlags`) --
export const moduleFlags = {
  /** No lleva workspace: es un interruptor global de la instalación, no de
   * un presupuesto en particular. */
  status: () =>
    api.get<ModuleFlagsStatus>('/module-flags/', { skipWorkspace: true }).then((r) => r.data),
};
