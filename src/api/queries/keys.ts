import type { TransactionListParams, WalletListParams } from '@/api/resources';
import type { YearMonth } from '@/lib/date';

/**
 * Fábrica de query keys. Todo lo scoped por workspace lleva `ws` en la key para
 * que al cambiar de workspace React Query trate los datos como otra colección.
 */
export const qk = {
  me: () => ['me'] as const,
  workspaces: () => ['workspaces'] as const,
  notificationPreferences: () => ['notification-preferences'] as const,

  ws: (ws: string | null) => ({
    all: ['ws', ws] as const,

    memberships: () => ['ws', ws, 'memberships'] as const,
    personalTokens: () => ['ws', ws, 'personal-tokens'] as const,
    exchangeRates: () => ['ws', ws, 'exchange-rates'] as const,

    wallets: (params?: WalletListParams) =>
      ['ws', ws, 'wallets', params ?? {}] as const,
    wallet: (id: string) => ['ws', ws, 'wallet', id] as const,
    walletProjection: (id: string) => ['ws', ws, 'wallet', id, 'projection'] as const,
    walletStatement: (id: string, asOf?: string) =>
      ['ws', ws, 'wallet', id, 'statement', asOf ?? 'today'] as const,
    walletStatements: () => ['ws', ws, 'wallets', 'statements'] as const,
    categories: () => ['ws', ws, 'categories'] as const,
    categoriesDeleted: () => ['ws', ws, 'categories', 'deleted'] as const,

    transactions: (params?: TransactionListParams) =>
      ['ws', ws, 'transactions', params ?? {}] as const,
    transaction: (id: string) => ['ws', ws, 'transaction', id] as const,
    receiptImage: (id: string) => ['ws', ws, 'transaction', id, 'receipt'] as const,

    categoryBudgets: (ym?: YearMonth) =>
      ['ws', ws, 'category-budgets', ym ?? {}] as const,

    recurringExpenses: () => ['ws', ws, 'recurring-expenses'] as const,
    recurringExpense: (id: string) => ['ws', ws, 'recurring-expense', id] as const,
    recurringSuggestions: () => ['ws', ws, 'recurring-suggestions'] as const,

    installments: () => ['ws', ws, 'installments'] as const,
    installment: (id: string) => ['ws', ws, 'installment', id] as const,

    monthlySnapshots: () => ['ws', ws, 'monthly-snapshots'] as const,

    emailImportLogs: (status?: string) =>
      ['ws', ws, 'email-import-logs', status ?? 'all'] as const,
    emailImportLog: (id: string) => ['ws', ws, 'email-import-log', id] as const,

    reportNetWorth: () => ['ws', ws, 'reports', 'net-worth'] as const,
    reportSummary: () => ['ws', ws, 'reports', 'summary'] as const,
    reportBudget: (ym?: YearMonth) => ['ws', ws, 'reports', 'budget', ym ?? {}] as const,
    reportCashflow: (months: number) => ['ws', ws, 'reports', 'cashflow', months] as const,
    reportCategoryTrends: (months: number) =>
      ['ws', ws, 'reports', 'category-trends', months] as const,
    reportScheduled: (range?: { since?: string; until?: string }) =>
      ['ws', ws, 'reports', 'scheduled', range ?? {}] as const,
  }),
};
