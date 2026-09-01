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
import type { TransactionInput, WalletInput } from '@/api/types';
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

// --- carteras (wallets) --------------------------------------------
export function useWallets() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).wallets(),
    queryFn: () => res.wallets.list(),
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

export function useCategories() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).categories(),
    queryFn: res.categories.list,
    enabled: !!ws,
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
