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

import * as res from '@/api/resources';
import type {
  CategoryInput,
  InstallmentPurchaseInput,
  RecurringExpenseInput,
  TransactionInput,
  WalletInput,
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

// --- carteras (wallets) --------------------------------------------
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

export function useReorderCategories() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (ids: string[]) => res.categories.reorder(ids),
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

// --- presupuestos --------------------------------------------------
export function useCategoryBudgets(ym: YearMonth = currentYearMonth()) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).categoryBudgets(ym),
    queryFn: () => res.categoryBudgets.list(ym),
    enabled: !!ws,
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

export function usePayInstallment() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => res.installments.pay(id),
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

/** Recurrentes + cuotas próximas (default: hoy → fin de mes). */
export function useScheduled(range?: { since?: string; until?: string }) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).reportScheduled(range),
    queryFn: () => res.reports.scheduled(range),
    enabled: !!ws,
  });
}
