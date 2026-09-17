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
  BudgetPeriod,
  CategoryBudgetInput,
  CategoryInput,
  ConfirmEmailImportInput,
  EmailImportStatus,
  ISODate,
  InstallmentPurchaseInput,
  Money,
  MyPlan,
  NotificationPreferences,
  RecurringExpenseInput,
  SetForwardBudgetInput,
  SplitPeopleInput,
  SupportTicketInput,
  TransactionInput,
  TransactionSplitPart,
  WalletInput,
  WorkspaceBackup,
} from '@/api/types';
import { todayISO } from '@/lib/date';
import { periodStart } from '@/lib/periods';
import { useWorkspaceStore } from '@/store/workspace';
import { qk } from './keys';

/**
 * Invalida todo lo scoped al workspace activo (tras una mutación).
 *
 * A propósito NO devuelve la promesa de `invalidateQueries`: los ~40 sitios
 * que hacen `onSuccess: invalidate` pasan esta función tal cual como
 * callback, y React Query espera lo que ese callback devuelva antes de
 * resolver `mutateAsync`. Si devolviera la promesa, cada "guardar" se
 * quedaba esperando el refetch de TODO el workspace (historial, dashboard,
 * presupuestos...) antes de cerrar el modal o navegar -- de ahí la
 * sensación de espera. Al no devolverla, el refetch sigue en segundo plano
 * (las queries montadas se actualizan solas al llegar) y la UI reacciona
 * apenas responde el POST/PATCH/DELETE en sí.
 */
function useInvalidateWorkspace() {
  const ws = useActiveWs();
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['ws', ws], type: 'all' });
  };
}

/** `budget_period` del workspace activo (default 'monthly' mientras no cargó
 * la lista de workspaces todavía). */
function useActiveBudgetPeriod(): BudgetPeriod {
  return useWorkspaceStore(
    (s) => s.workspaces.find((w) => w.id === s.activeId)?.budget_period ?? 'monthly',
  );
}

/** El `period_start` "de hoy" para el workspace activo -- default de
 * `useCategoryBudgets`/`useBudgetReport` cuando no se pasa uno explícito. */
function useCurrentBudgetPeriodStart(): ISODate {
  const budgetPeriod = useActiveBudgetPeriod();
  return periodStart(todayISO(), budgetPeriod);
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

export function useRenameWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => res.workspaces.rename(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workspaces() }),
  });
}

/** Borra un presupuesto (no el activo necesariamente -- ver `workspaces.tsx`).
 * Si borra el activo, quien llama debe elegir otro y actualizar el store. */
export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => res.workspaces.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workspaces() }),
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

/** Cadencia del presupuesto (diario/semanal/quincenal/mensual/anual). Solo
 * owner. Cambiarla no reescribe los presupuestos ya guardados -- ver
 * docstring de `WorkspaceSerializer.update` en el backend. */
export function useSetBudgetPeriod() {
  const invalidate = useInvalidateWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, period }: { id: string; period: BudgetPeriod }) =>
      res.workspaces.setBudgetPeriod(id, period),
    onSuccess: async () => {
      invalidate(); // el reporte/lista de presupuesto cacheados quedan con la cadencia vieja
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

// --- centro de notificaciones (por usuario, no por workspace) ---------
export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications(),
    queryFn: res.notifications.list,
  });
}

/** El contador de la campanita del header -- se repolla cada minuto (única
 * query de toda la app que lo hace) porque, a diferencia del resto, tiene
 * que sentirse "vivo" sin depender de que el usuario dispare un refetch
 * navegando a algún lado: vive montado en casi todas las pantallas. */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: qk.unreadNotificationCount(),
    queryFn: res.notifications.unreadCount,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => res.notifications.markRead(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.notifications() });
      await qc.invalidateQueries({ queryKey: qk.unreadNotificationCount() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => res.notifications.markAllRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.notifications() });
      await qc.invalidateQueries({ queryKey: qk.unreadNotificationCount() });
    },
  });
}

// --- pagos y suscripciones (por usuario, no por workspace) ------------
/** Catálogo de planes + precios activos -- alimenta la pantalla de Pro sin
 * hardcodear nombre, límites ni precio en el cliente. */
export function usePlans() {
  return useQuery({
    queryKey: qk.plans(),
    queryFn: res.plans.list,
    staleTime: 5 * 60 * 1000,
  });
}

/** Plan efectivo del usuario autenticado + su suscripción vigente. */
export function useMyPlan() {
  return useQuery({
    queryKey: qk.myPlan(),
    queryFn: res.billing.me,
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (input: res.CheckoutInput) => res.billing.checkout(input),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => res.billing.cancel(),
    onSuccess: (subscription) => qc.setQueryData(qk.myPlan(), (prev: MyPlan | undefined) =>
      prev ? { ...prev, subscription } : prev,
    ),
  });
}

/** Canjear un código de invitación reemplaza el plan efectivo directo (a
 * diferencia de cancelar, acá `subscription.plan` puede ser distinto del
 * que tenía antes -- por eso no hace merge parcial, pisa los dos campos). */
export function useRedeemPromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => res.billing.redeem(code),
    onSuccess: (subscription) =>
      qc.setQueryData(qk.myPlan(), { plan: subscription.plan, subscription }),
  });
}

/** Arrancar una prueba gratis reemplaza el plan efectivo directo, igual que
 * canjear un código -- mismo motivo: el plan puede cambiar del todo. */
export function useStartTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => res.billing.startTrial(planId),
    onSuccess: (subscription) =>
      qc.setQueryData(qk.myPlan(), { plan: subscription.plan, subscription }),
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

// --- catálogo de lealtad (global; solo lectura acá, se edita en el admin) --
export function useLoyaltyBanks() {
  return useQuery({
    queryKey: qk.loyaltyBanks(),
    queryFn: () => res.loyaltyBanks.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoyaltyCategoryTypes() {
  return useQuery({
    queryKey: qk.loyaltyCategoryTypes(),
    queryFn: () => res.loyaltyCategoryTypes.list(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Productos de tarjeta (con sus programas y tasas ya anidados) -- para
 * armar el selector Banco -> Producto al editar una tarjeta. */
export function useCardProducts() {
  return useQuery({
    queryKey: qk.cardProducts(),
    queryFn: () => res.cardProducts.list(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Saldo de puntos por cartera + cashback ganado / descuento ahorrado en el
 * período (ambas fechas opcionales). */
export function useLoyaltySummary(range?: { date_after?: string; date_before?: string }) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).loyaltySummary(range),
    queryFn: () => res.loyaltyEarnings.summary(range),
    enabled: !!ws,
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

/** Solo tiene sentido en una cartera de ahorro con tasa configurada -- el
 * caller pasa `enabled` (típicamente `purpose === 'savings' &&
 * !!savings_interest_rate`) para no pegarle a un 404 en cualquier otra
 * cartera. `year`/`month` por defecto el mes en curso. */
export function useSavingsInterestProjection(
  id: string | undefined,
  enabled: boolean,
  year?: number,
  month?: number
) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).walletInterestProjection(id ?? '', year, month),
    queryFn: () => res.wallets.interestProjection(id!, year, month),
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
    // Si falla, refetch igual: es lo que hace que `DragList` (que ya
    // reordenó de forma optimista/local al soltar) vuelva al orden real del
    // servidor en vez de quedarse mostrando un orden que no se guardó.
    onError: invalidate,
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
    // Ver comentario en `useReorderWallets`: si falla, refetch igual para
    // que `DragList` vuelva al orden real del servidor.
    onError: invalidate,
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

/** Recibo (foto o PDF) como data URI, lista para `<Image source={{uri}}>`
 * cuando es una imagen (ver `contentType` para decidir cómo mostrarlo -- un
 * PDF no se puede dibujar así). El endpoint exige el mismo auth que el resto
 * del API, así que no se puede apuntar un <Image>/link directo a la URL —
 * se trae por axios (que ya manda los headers) y se arma el data URI acá. */
export function useReceiptImage(id: string | undefined, hasReceipt: boolean) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).receiptImage(id ?? ''),
    queryFn: async () => {
      const { data, contentType } = await res.transactions.getReceiptBlob(id!);
      const base64 = encodeBase64(new Uint8Array(data));
      return { uri: `data:${contentType};base64,${base64}`, base64, contentType };
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

// --- dividir transacciones entre personas -----------------------------
export function usePeople() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).people(),
    queryFn: () => res.people.list(),
    enabled: !!ws,
  });
}

export function useCreatePerson() {
  const ws = useActiveWs();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => res.people.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ws(ws).people() }),
  });
}

export function useSplitTransactionPeople() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SplitPeopleInput }) =>
      res.transactions.splitPeople(id, input),
    onSuccess: invalidate,
  });
}

export function useSettleShare() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, shareId, isSettled }: { id: string; shareId: string; isSettled: boolean }) =>
      res.transactions.settleShare(id, shareId, isSettled),
    onSuccess: invalidate,
  });
}

export function usePersonBalances() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).personBalances(),
    queryFn: () => res.transactions.balances(),
    enabled: !!ws,
  });
}

/** Chequeo puntual (no un hook de React Query -- se llama a mano justo
 * antes de guardar, ver TransactionForm) de si ya existe una transacción
 * parecida, para avisar sin bloquear el alta manual. */
export function checkDuplicateTransaction(params: {
  wallet: string;
  amount: Money;
  date: string;
  exclude?: string;
}) {
  return res.transactions.checkDuplicate(params);
}

/** Bytes del .xlsx de la plantilla (para descargarlo). No cachea: cada
 * llamada trae las carteras/categorías tal como están ahora. */
export function useImportTemplate() {
  return useMutation({
    mutationFn: () => res.transactions.importTemplate(),
  });
}

/** Sube la plantilla llena y crea todo lo que se pueda -- ver
 * `TransactionImportResult`. Invalida el workspace igual si hubo errores
 * parciales: lo que sí se creó ya afecta saldos/reportes. */
export function useImportTransactionsXlsx() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (file: File) => res.transactions.importXlsx(file),
    onSuccess: invalidate,
  });
}

// --- presupuestos --------------------------------------------------
/** `periodStart` (default: el período actual del workspace activo, ver
 * `budget_period`): el inicio exacto del período a listar. */
export function useCategoryBudgets(periodStart?: ISODate) {
  const ws = useActiveWs();
  const currentPeriodStart = useCurrentBudgetPeriodStart();
  const start = periodStart ?? currentPeriodStart;
  return useQuery({
    queryKey: qk.ws(ws).categoryBudgets(start),
    queryFn: () => res.categoryBudgets.list({ period_start: start }),
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

export function useClearFailedEmailImports() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: () => res.emailImportLogs.clearFailed(),
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

/** `periodStart` (default: el período actual del workspace activo). */
export function useBudgetReport(periodStart?: ISODate) {
  const ws = useActiveWs();
  const currentPeriodStart = useCurrentBudgetPeriodStart();
  const start = periodStart ?? currentPeriodStart;
  return useQuery({
    queryKey: qk.ws(ws).reportBudget(start),
    queryFn: () => res.reports.budget({ period_start: start }),
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

/** Recurrentes, cuotas, pago de tarjeta y vencimiento de deuda próximos
 * (default: hoy → fin de mes; acepta cualquier rango, no sólo hacia
 * adelante -- lo usa también el calendario financiero). */
export function useScheduled(range?: { since?: string; until?: string }) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).reportScheduled(range),
    queryFn: () => res.reports.scheduled(range),
    enabled: !!ws,
  });
}

// --- soporte (reportar errores, consultas, sugerencias) -----------------
export function useSupportTickets(params: res.SupportTicketListParams = {}) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).supportTickets(params),
    queryFn: () => res.supportTickets.list(params),
    enabled: !!ws,
  });
}

export function useSupportTicket(id: string | undefined) {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).supportTicket(id ?? ''),
    queryFn: () => res.supportTickets.get(id!),
    enabled: !!ws && !!id,
  });
}

export function useCreateSupportTicket() {
  const ws = useActiveWs();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SupportTicketInput) => res.supportTickets.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ws(ws).supportTickets() }),
  });
}

export function useReplySupportTicket() {
  const ws = useActiveWs();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      res.supportTickets.reply(id, message),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: qk.ws(ws).supportTickets() });
      qc.setQueryData(qk.ws(ws).supportTicket(ticket.id), ticket);
    },
  });
}

// --- gamificación (racha, badges) ---------------------------------------
/** Racha actual/máxima sin gasto fuera de presupuesto, fines de semana sin
 * gastos, % de ahorro del mes en curso y estado de cada badge. De paso el
 * backend otorga cualquier badge nuevo que ya se haya ganado. */
export function useGamificationSummary() {
  const ws = useActiveWs();
  return useQuery({
    queryKey: qk.ws(ws).gamificationSummary(),
    queryFn: () => res.gamification.summary(),
    enabled: !!ws,
  });
}
