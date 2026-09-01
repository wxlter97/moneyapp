import type { TransactionListParams } from '@/api/resources';
import type { YearMonth } from '@/lib/date';

/**
 * Fábrica de query keys. Todo lo scoped por workspace lleva `ws` en la key para
 * que al cambiar de workspace React Query trate los datos como otra colección.
 */
export const qk = {
  me: () => ['me'] as const,
  workspaces: () => ['workspaces'] as const,

  ws: (ws: string | null) => ({
    all: ['ws', ws] as const,

    wallets: () => ['ws', ws, 'wallets'] as const,
    wallet: (id: string) => ['ws', ws, 'wallet', id] as const,
    categories: () => ['ws', ws, 'categories'] as const,

    transactions: (params?: TransactionListParams) =>
      ['ws', ws, 'transactions', params ?? {}] as const,
    transaction: (id: string) => ['ws', ws, 'transaction', id] as const,

    categoryBudgets: (ym?: YearMonth) =>
      ['ws', ws, 'category-budgets', ym ?? {}] as const,

    monthlySnapshots: () => ['ws', ws, 'monthly-snapshots'] as const,

    reportNetWorth: () => ['ws', ws, 'reports', 'net-worth'] as const,
    reportSummary: () => ['ws', ws, 'reports', 'summary'] as const,
    reportBudget: (ym?: YearMonth) => ['ws', ws, 'reports', 'budget', ym ?? {}] as const,
    reportCashflow: (months: number) => ['ws', ws, 'reports', 'cashflow', months] as const,
  }),
};
