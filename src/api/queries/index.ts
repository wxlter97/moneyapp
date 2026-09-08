/**
 * Hooks de React Query por recurso. Todos leen el workspace activo del store
 * y se deshabilitan si aún no hay uno seleccionado.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { fromByteArray as encodeBase64 } from 'base64-js';

import * as res from '@/api/resources';
import type {
  CategoryBudgetInput,
  CategoryInput,
  ConfirmEmailImportInput,
  EmailImportStatus,
  InstallmentPurchaseInput,
  NotificationPreferences,
  RecurringExpenseInput,
  SetForwardBudgetInput,
  TransactionInput,
  TransactionSplitPart,
  WalletInput,
  WorkspaceBackup,
} from '@/api/types';
import { currentYearMonth, type YearMonth } from '@/lib/date';
import { useWorkspaceStore } from '@/store/workspace';
import { qk } from './keys';

/** Invalida todo lo scoped al workspace activo (tras una mutación). */
function useInvalidateWorkspace() {
  const ws = useActiveWs();
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['ws', ws], type: 'all' });
}

function useActiveWs() {
  return useWorkspaceStore((s) => s.activeId);
}

type Opts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>;

// --- workspaces ---------------------------------------------------------
export function useWorkspaces(opts?: Opts<Awaited<ReturnType<typeof res.workspaces.list>>>) {
  return useQuery({
    queryKey: qk.workspaces(),
    queryFn: res.workspaces.list,
    ...opts,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);
  return useMutation({
    mutationFn: (name: string) => res.workspaces.create(name),
    onSuccess: async (workspace) => {
      await qc.invalidateQueries({ queryKey: qk.workspaces() });
      setActiveId(workspace.id); // salta al presupuesto recién creado
    },
  });
}

export function useResetWorkspace() {
  const ws = useActiveWs();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: res.ResetScope }) =>
      res.workspaces.reset(id, scope),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ws', ws], type: 'all' }),
  });
}

/** Trae el respaldo completo del workspace (para descargarlo). No cachea:
 * cada llamada pide un snapshot fresco. */
export function useDownloadBackup() {
  return useMutation({
    mutationFn: (id: string) => res.workspaces.backup(id),
  });
}

/** Reemplaza TODO el contenido del workspace por el de un respaldo. Irreversible. */
export function useRestoreWorkspace() {
  const ws = useActiveWs();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, backup }: { id: string; backup: WorkspaceBackup }) =>
      res.workspaces.restore(id, backup),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ws', ws], type: 'all' }),
  });
}

/** Genera una dirección de importación nueva para el workspace; invalida la anterior. */
export function useRotateInboundToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => res.workspaces.rotateInboundToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workspaces() }),
  });
}

/** Moneda de los totales agregados (patrimonio, presupuesto, flujo). Solo owner. */
export function useSetBaseCurrency() {
  const invalidate = useInvalidateWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, currency }: { id: string; currency: string }) =>
      res.workspaces.setBaseCurrency(id, currency),
    onSuccess: async () => {
      invalidate(); // los reportes cacheados quedan en la moneda vieja
      await qc.invalidateQueries({ queryKey: qk.workspaces() });
    },
  });
}

// --- tasas de cambio (workspace activo) -------------------------------
export function useExchangeRates() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).exchangeRates(),
    queryFn: () => res.exchangeRates.list(),
    enabled: !!ws,
  });
}

export function useSetExchangeRate() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ currency, rate }: { currency: string; rate: string }) =>
      res.exchangeRates.set(currency, rate),
    onSuccess: invalidate,
  });
}

export function useDeleteExchangeRate() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.exchangeRates.remove(id),
    onSuccess: invalidate,
  });
}

// --- miembros del workspace activo ----------------------------------------
export function useMemberships() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).memberships(),
    queryFn: () => res.memberships.list(),
    enabled: !!ws,
  });
}

export function useInviteMember() {
  const invalidate = useInvalidateWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role?: 'owner' | 'member' }) =>
      res.memberships.invite(email, role),
    onSuccess: async () => {
      invalidate();
      // el `member_count` de la lista de workspaces también cambió
      await qc.invalidateQueries({ queryKey: qk.workspaces() });
    },
  });
}

// --- invitaciones A MÍ (por mi correo, en cualquier workspace) -------------
export function useMyInvitations() {
  return useQuery({
    queryKey: qk.myInvitations(),
    queryFn: () => res.invitations.mine(),
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => res.invitations.accept(token),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.myInvitations() });
      await qc.invalidateQueries({ queryKey: qk.workspaces() });
    },
  });
}

/** Vista pública del enlace de invitación (`budget://invite/<token>`), sin sesión. */
export function useInvitationPreview(token: string | undefined) {
  return useQuery({
    queryKey: ['invitations', 'preview', token],
    queryFn: () => res.invitations.preview(token!),
    enabled: !!token,
    retry: false,
  });
}

export function useDeclineInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => res.invitations.decline(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myInvitations() }),
  });
}

export function useUpdateMembershipRole() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'owner' | 'member' }) =>
      res.memberships.updateRole(id, role),
    onSuccess: invalidate,
  });
}

export function useRemoveMembership() {
  const invalidate = useInvalidateWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => res.memberships.remove(id),
    onSuccess: async () => {
      invalidate();
      await qc.invalidateQueries({ queryKey: qk.workspaces() });
    },
  });
}

// --- preferencias de notificaciones (por usuario, no por workspace) ----
export function useNotificationPreferences() {
  return useQuery({
    queryKey: qk.notificationPreferences(),
    queryFn: res.notificationPreferences.get,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  const key = qk.notificationPreferences();
  return useMutation({
    mutationFn: (input: Partial<NotificationPreferences>) =>
      res.notificationPreferences.update(input),
    // UI optimista: los switches de esta pantalla deben sentirse instantáneos
    // (antes tardaban lo que tardara el POST). Si el guardado falla, se
    // revierte al valor previo.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NotificationPreferences>(key);
      if (previous) qc.setQueryData(key, { ...previous, ...input });
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSuccess: (data) => qc.setQueryData(key, data),
  });
}

// --- tokens personales (Atajos de Apple Shortcuts) --------------------
export function usePersonalTokens() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).personalTokens(),
    queryFn: () => res.personalTokens.list(),
    enabled: !!ws,
  });
}

export function useCreatePersonalToken() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ name, walletId }: { name: string; walletId: string }) =>
      res.personalTokens.create(name, walletId),
    onSuccess: invalidate,
  });
}

export function useDeletePersonalToken() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.personalTokens.remove(id),
    onSuccess: invalidate,
  });
}

// --- carteras (wallets) --------------------------------------------
/** Catálogo global de bancos soportados por el importador (no cambia por workspace). */
export function useBankEmailSchemas() {
  return useQuery({
    queryKey: qk.bankEmailSchemas(),
    queryFn: () => res.bankEmailSchemas.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWallets(params?: res.WalletListParams) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).wallets(params),
    queryFn: () => res.wallets.list(params),
    enabled: !!ws,
  });
}

export function useWallet(id: string | undefined) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).wallet(id ?? ''),
    queryFn: () => res.wallets.get(id!),
    enabled: !!ws && !!id,
  });
}

export function useCreateWallet() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (input: WalletInput) => res.wallets.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateWallet() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WalletInput> }) =>
      res.wallets.update(id, input),
    onSuccess: invalidate,
  });
}

/** Solo tiene sentido en una meta de ahorro -- el caller pasa `enabled`
 * (típicamente `purpose === 'savings' && !!goal_amount`) para no pegarle a
 * un 404 en cualquier otra cartera. */
export function useGoalProjection(id: string | undefined, enabled: boolean) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).walletProjection(id ?? ''),
    queryFn: () => res.wallets.projection(id!),
    enabled: !!ws && !!id && enabled,
  });
}

/** Estado de cuenta de una tarjeta de crédito a `asOf` (hoy si se omite). */
export function useCreditCardStatement(id: string | undefined, asOf?: string) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).walletStatement(id ?? '', asOf),
    queryFn: () => res.wallets.statement(id!, asOf),
    enabled: !!ws && !!id,
  });
}

/** Estado de cuenta de todas las tarjetas de crédito del workspace, a hoy. */
export function useCreditCardStatements() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).walletStatements(),
    queryFn: () => res.wallets.statements(),
    enabled: !!ws,
  });
}

export function useDeleteWallet() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.wallets.remove(id),
    onSuccess: invalidate,
  });
}

export function useArchiveWallet() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.wallets.archive(id),
    onSuccess: invalidate,
  });
}

export function useUnarchiveWallet() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.wallets.unarchive(id),
    onSuccess: invalidate,
  });
}

export function useSplitWallet() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => res.wallets.split(id, name),
    onSuccess: invalidate,
  });
}

export function useReorderWallets() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (ids: string[]) => res.wallets.reorder(ids),
    onSuccess: invalidate,
  });
}

export function useCategories() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).categories(),
    queryFn: res.categories.list,
    enabled: !!ws,
  });
}

export function useCreateCategory() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (input: CategoryInput) => res.categories.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) =>
      res.categories.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.categories.remove(id),
    onSuccess: invalidate,
  });
}

export function useDeletedCategories() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).categoriesDeleted(),
    queryFn: res.categories.deleted,
    enabled: !!ws,
  });
}

export function useRestoreCategory() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.categories.restore(id),
    onSuccess: invalidate,
  });
}

export function useHardDeleteCategory() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.categories.purge(id),
    onSuccess: invalidate,
  });
}

export function useReorderCategories() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (ids: string[]) => res.categories.reorder(ids),
    onSuccess: invalidate,
  });
}

// --- etiquetas (tags) --------------------------------------------------
export function useTags() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).tags(),
    queryFn: res.tags.list,
    enabled: !!ws,
  });
}

/** Ingresos/gastos/cantidad acumulados por etiqueta -- "cuánto llevo gastado
 * en el viaje X" sin importar en qué categoría cayó cada gasto. */
export function useTagSummary() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).tagSummary(),
    queryFn: res.tags.summary,
    enabled: !!ws,
  });
}

export function useCreateTag() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (name: string) => res.tags.create(name),
    onSuccess: invalidate,
  });
}

export function useUpdateTag() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => res.tags.update(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteTag() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.tags.remove(id),
    onSuccess: invalidate,
  });
}

// --- transacciones ---------------------------------------------------
export function useTransactions(params: res.TransactionListParams = {}) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).transactions(params),
    queryFn: () => res.transactions.list(params),
    enabled: !!ws,
  });
}

export function useTransaction(id: string | undefined) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).transaction(id ?? ''),
    queryFn: () => res.transactions.get(id!),
    enabled: !!ws && !!id,
  });
}

export function useCreateTransaction() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (input: TransactionInput) => res.transactions.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
      res.transactions.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.transactions.remove(id),
    onSuccess: invalidate,
  });
}

export function useUploadReceipt() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: { uri: string; name: string; type: string } }) =>
      res.transactions.uploadReceipt(id, file),
    onSuccess: invalidate,
  });
}

export function useRemoveReceipt() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.transactions.removeReceipt(id),
    onSuccess: invalidate,
  });
}

/** Foto del recibo como data URI, lista para `<Image source={{uri}}>`. El
 * endpoint exige el mismo auth que el resto del API, así que no se puede
 * apuntar un <Image> directo a la URL — se trae por axios (que ya manda
 * los headers) y se arma el data URI acá. */
export function useReceiptImage(id: string | undefined, hasReceipt: boolean) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).receiptImage(id ?? ''),
    queryFn: async () => {
      const { data, contentType } = await res.transactions.getReceiptBlob(id!);
      const base64 = encodeBase64(new Uint8Array(data));
      return `data:${contentType};base64,${base64}`;
    },
    enabled: !!ws && !!id && hasReceipt,
    staleTime: Infinity,
  });
}

export function useSplitTransaction() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, parts }: { id: string; parts: TransactionSplitPart[] }) =>
      res.transactions.split(id, parts),
    onSuccess: invalidate,
  });
}

// --- presupuestos --------------------------------------------------
export function useCategoryBudgets(ym: YearMonth = currentYearMonth()) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).categoryBudgets(ym),
    queryFn: () => res.categoryBudgets.list(ym),
    enabled: !!ws,
  });
}

export function useCreateCategoryBudget() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (input: CategoryBudgetInput) => res.categoryBudgets.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategoryBudget() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryBudgetInput> }) =>
      res.categoryBudgets.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategoryBudget() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.categoryBudgets.remove(id),
    onSuccess: invalidate,
  });
}

/** Fija el presupuesto del mes y lo propaga a los meses futuros (ver tipo
 * `SetForwardBudgetResult`); el histórico de meses anteriores no se toca. */
export function useSetForwardCategoryBudget() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (input: SetForwardBudgetInput) => res.categoryBudgets.setForward(input),
    onSuccess: invalidate,
  });
}

// --- recurrentes -------------------------------------------------
export function useRecurringExpenses() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).recurringExpenses(),
    queryFn: res.recurringExpenses.list,
    enabled: !!ws,
  });
}

export function useRecurringExpense(id: string | undefined) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).recurringExpense(id ?? ''),
    queryFn: () => res.recurringExpenses.get(id!),
    enabled: !!ws && !!id,
  });
}

export function useCreateRecurringExpense() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (input: RecurringExpenseInput) => res.recurringExpenses.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateRecurringExpense() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RecurringExpenseInput> }) =>
      res.recurringExpenses.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteRecurringExpense() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.recurringExpenses.remove(id),
    onSuccess: invalidate,
  });
}

export function useRecurringSuggestions() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).recurringSuggestions(),
    queryFn: res.recurringExpenses.suggestions,
    enabled: !!ws,
  });
}

export function useDismissRecurringSuggestion() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ category, wallet, amount }: { category: string; wallet: string; amount: string }) =>
      res.recurringExpenses.dismissSuggestion(category, wallet, amount),
    onSuccess: invalidate,
  });
}

// --- compras a plazo (cuotas) -----------------------------------
export function useInstallments() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).installments(),
    queryFn: res.installments.list,
    enabled: !!ws,
  });
}

export function useInstallment(id: string | undefined) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).installment(id ?? ''),
    queryFn: () => res.installments.get(id!),
    enabled: !!ws && !!id,
  });
}

export function useCreateInstallment() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (input: InstallmentPurchaseInput) => res.installments.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateInstallment() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<InstallmentPurchaseInput> }) =>
      res.installments.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteInstallment() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.installments.remove(id),
    onSuccess: invalidate,
  });
}

// --- snapshots ----------------------------------------------------
export function useMonthlySnapshots() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).monthlySnapshots(),
    queryFn: res.monthlySnapshots.list,
    enabled: !!ws,
  });
}

// --- bandeja de importación bancaria por correo -----------------------
export function useEmailImportLogs(status?: EmailImportStatus) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).emailImportLogs(status),
    queryFn: () => res.emailImportLogs.list(status),
    enabled: !!ws,
  });
}

export function useEmailImportLog(id: string | undefined) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).emailImportLog(id ?? ''),
    queryFn: () => res.emailImportLogs.get(id!),
    enabled: !!ws && !!id,
  });
}

export function useConfirmEmailImport() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConfirmEmailImportInput }) =>
      res.emailImportLogs.confirm(id, input),
    onSuccess: invalidate,
  });
}

export function useRejectEmailImport() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.emailImportLogs.reject(id),
    onSuccess: invalidate,
  });
}

// --- reportes ---------------------------------------------------
export function useNetWorth() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).reportNetWorth(),
    queryFn: res.reports.netWorth,
    enabled: !!ws,
  });
}

export function useDashboardSummary() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).reportSummary(),
    queryFn: res.reports.summary,
    enabled: !!ws,
  });
}

export function useBudgetReport(ym: YearMonth = currentYearMonth()) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).reportBudget(ym),
    queryFn: () => res.reports.budget(ym),
    enabled: !!ws,
  });
}

export function useCashflow(months = 6) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).reportCashflow(months),
    queryFn: () => res.reports.cashflow(months),
    enabled: !!ws,
  });
}

export function useCategoryTrends(months = 6) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).reportCategoryTrends(months),
    queryFn: () => res.reports.categoryTrends(months),
    enabled: !!ws,
  });
}

/** Recurrentes + cuotas próximas (default: hoy → fin de mes). */
export function useScheduled(range?: { since?: string; until?: string }) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).reportScheduled(range),
    queryFn: () => res.reports.scheduled(range),
    enabled: !!ws,
  });
}
