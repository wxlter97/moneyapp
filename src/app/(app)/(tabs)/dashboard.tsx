import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FadeInView } from '@/components/ui/FadeInView';
import { useUIStore } from '@/store/ui';

import {
  useBudgetReport,
  useDashboardSummary,
  useNetWorth,
  useScheduled,
  useTags,
  useTransactions,
  useWallets,
} from '@/api/queries';
import { useCategoryMap, useWalletMap } from '@/api/queries/lookups';
import type { ScheduledItem } from '@/api/types';
import { AddTransactionFab } from '@/components/AddTransactionFab';
import { CalendarGrid, type DayMarker } from '@/components/CalendarGrid';
import { DayHeader } from '@/components/DayHeader';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { SectionHeader } from '@/components/SectionHeader';
import { SubTabs } from '@/components/SubTabs';
import { SummaryTriple } from '@/components/SummaryTriple';
import { TransactionRow } from '@/components/TransactionRow';
import { AmountInput } from '@/components/ui/AmountInput';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { usePullRefresh } from '@/components/ui/PullRefresh';
import { SearchField } from '@/components/ui/SearchField';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { currentYearMonth, formatDayHeader, formatShortDate, monthRange, todayISO } from '@/lib/date';
import { formatMoney, toNumber } from '@/lib/money';
import { groupByDay, summarizeByType, useSwipeDeleteTransactions } from '@/lib/transactions';
import { useWorkspaceStore } from '@/store/workspace';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

export default function OverviewScreen() {
  const tab = useUIStore((s) => s.overviewTab);
  const setTab = useUIStore((s) => s.setOverviewTab);
  const [month, setMonth] = useState(currentYearMonth);

  const netWorth = useNetWorth();
  // La del workspace (ver Workspace.base_currency): es en la que ya vienen
  // convertidos los totales agregados -- nunca la de "la primera cartera",
  // que ni siquiera es la moneda correcta si hay más de una en uso.
  const activeWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId));
  const currency = activeWorkspace?.base_currency ?? 'USD';

  return (
    <View className="flex-1 bg-bg">
      <SectionHeader
        title="Inicio"
        right={
          <Pressable
            onPress={() => {
              haptics.tap();
              router.push('/net-worth-history');
            }}
            className="rounded-full bg-surface-2 px-3 py-1.5 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Ver historial de patrimonio neto"
          >
            <Text className="text-text text-sm font-semibold">Historial</Text>
          </Pressable>
        }
        subtitle={
          // El monto ya no es tocable: era el elemento más grande de toda la
          // pantalla y ocupaba casi todo el header, así que cualquier toque
          // cerca del centro (p. ej. buscando el switch de mes debajo)
          // mandaba a Historial por error. Ese acceso ahora vive en el botón
          // de arriba, chico y a propósito.
          <View className="w-full items-center">
            <Money
              value={netWorth.data?.net}
              currency={currency}
              hero
              className="text-center text-[52px] leading-[56px]"
            />
          </View>
        }
      >
        <SubTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'resumen', label: 'Resumen' },
            { value: 'lista', label: 'Lista' },
            { value: 'calendario', label: 'Calendario' },
          ]}
        />
      </SectionHeader>

      {tab === 'resumen' ? (
        <ResumenTab currency={currency} />
      ) : tab === 'lista' ? (
        <ListaTab month={month} onMonth={setMonth} currency={currency} />
      ) : (
        <CalendarTab currency={currency} />
      )}

      <AddTransactionFab />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
function ResumenTab({ currency }: { currency: string }) {
  const colors = useColors();
  const summary = useDashboardSummary();
  const wallets = useWallets();
  const budget = useBudgetReport();
  const scheduled = useScheduled();
  const netWorth = useNetWorth();
  const { map: categories } = useCategoryMap();

  const spendingWallets = (wallets.data ?? []).filter((w) => w.purpose === 'spending');
  // Todas las tarjetas de crédito (cualquier moneda, para el conteo), pero
  // el monto sumado se limita a la moneda base -- mismo criterio que el
  // resto de los totales de esta pantalla (ver `ListaTab`), para no mezclar
  // montos de distintas monedas en una sola cifra. `current_balance`
  // negativo = lo que debes (ver `Wallet` en el backend); `Math.max(0, …)`
  // por si alguna tarjeta quedó sobrepagada (saldo a favor).
  const creditWallets = (wallets.data ?? []).filter((w) => w.kind === 'credit');
  const cardDebt = creditWallets
    .filter((w) => w.currency === currency)
    .reduce((sum, w) => sum + Math.max(0, -toNumber(w.current_balance)), 0);
  const loading = summary.isLoading || wallets.isLoading || netWorth.isLoading;
  const refreshing =
    summary.isFetching || wallets.isFetching || budget.isFetching || scheduled.isFetching || netWorth.isFetching;
  const refresh = usePullRefresh(loading ? false : refreshing, () => {
    summary.refetch();
    wallets.refetch();
    budget.refetch();
    scheduled.refetch();
    netWorth.refetch();
  });

  if (loading) {
    return (
      <ScrollView contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-4">
        <ResumenSkeleton />
      </ScrollView>
    );
  }
  if (summary.isError)
    return <ErrorState error={summary.error} onRetry={summary.refetch} />;

  const budgetTotals = budget.data?.totals;
  const budgeted = toNumber(budgetTotals?.budgeted);
  const remaining = toNumber(budgetTotals?.remaining);
  const overBudget = remaining < 0;
  const hasBudget = (budget.data?.rows.length ?? 0) > 0;
  const topCategory = summary.data?.top_expense_categories[0];
  const month = currentYearMonth();

  return (
    <ScrollView
      contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-4"
      refreshControl={refresh}
    >
      {summary.data ? (
        <View className="gap-2">
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide">
            Este mes
          </Text>
          <SummaryTriple
            income={toNumber(summary.data.month.income)}
            expenses={toNumber(summary.data.month.expenses)}
            net={toNumber(summary.data.month.net)}
            currency={currency}
          />
          {summary.data.pending_email_imports > 0 ? (
            <Pressable
              onPress={() => {
                haptics.tap();
                router.push('/imports');
              }}
              accessibilityRole="button"
              className="flex-row items-center gap-1.5 self-start active:opacity-60"
            >
              <Icon name="inbox" size={14} color={colors.warning} />
              <Text className="text-warning text-xs" style={{ fontFamily: fonts.semibold }}>
                {summary.data.pending_email_imports} importación(es) por correo pendientes.
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScheduledCard items={scheduled.data ?? []} loading={scheduled.isLoading} currency={currency} />

      {/* Vistazo condensado: Carteras y Presupuesto ya tienen su propia
          pantalla con el detalle completo (listas, barras, historial) --
          acá sólo referenciamos la cifra y un toque lleva a esa pantalla,
          en vez de repetir listas enteras con su propio "Ver todo" cada
          una (eran 3 cards separadas antes de esto). */}
      <View className="gap-1.5">
        <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide">
          De un vistazo
        </Text>
        <View className="-m-1.5 flex-row flex-wrap">
          <GlanceTile icon="card" label="Carteras" onPress={() => router.push('/wallets')}>
            {spendingWallets.length === 0 ? (
              <Text className="text-text-muted text-sm">Crear una</Text>
            ) : (
              <>
                <Money value={netWorth.data?.by_purpose.spending} currency={currency} className="text-lg font-bold" />
                <Text className="text-text-muted text-[11px]" numberOfLines={1}>
                  {spendingWallets.length === 1 ? '1 cartera' : `${spendingWallets.length} carteras`}
                </Text>
              </>
            )}
          </GlanceTile>

          <GlanceTile icon="bars" label="Presupuesto" onPress={() => router.push('/budgets')}>
            {!hasBudget ? (
              <Text className="text-text-muted text-sm">Sin ajustar</Text>
            ) : (
              <>
                <Money
                  value={Math.abs(remaining)}
                  currency={currency}
                  tone={overBudget ? 'expense' : 'income'}
                  className="text-lg font-bold"
                />
                <Text className="text-text-muted text-[11px]" numberOfLines={1}>
                  {overBudget ? 'excedido' : 'restante'} de{' '}
                  <Money value={budgeted} currency={currency} tone="muted" className="text-[11px]" />
                </Text>
              </>
            )}
          </GlanceTile>

          {creditWallets.length > 0 ? (
            <GlanceTile
              icon="card"
              label="Deuda en tarjetas"
              wide
              onPress={() => router.push('/wallets')}
            >
              <Money value={cardDebt} currency={currency} tone="expense" className="text-lg font-bold" />
              <Text className="text-text-muted text-[11px]" numberOfLines={1}>
                {creditWallets.length === 1 ? '1 tarjeta' : `${creditWallets.length} tarjetas`}
              </Text>
            </GlanceTile>
          ) : null}

          <GlanceTile
            icon="tag"
            label="Gasto principal"
            wide
            onPress={() => {
              if (!topCategory) return router.push('/budgets');
              const { from, to } = monthRange(month);
              return router.push(`/category-transactions?category=${topCategory.category}&from=${from}&to=${to}`);
            }}
          >
            {!topCategory ? (
              <Text className="text-text-muted text-sm">Sin gastos categorizados este mes</Text>
            ) : (
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1 flex-row items-center gap-2">
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: categories.get(topCategory.category)?.color ?? colors.textMuted }}
                  />
                  <Text
                    className="text-text flex-1 text-sm"
                    style={{ fontFamily: fonts.semibold }}
                    numberOfLines={1}
                  >
                    {topCategory.category_name ?? 'Sin categoría'}
                  </Text>
                </View>
                <Money value={topCategory.spent} currency={currency} tone="expense" className="text-lg font-bold" />
              </View>
            )}
          </GlanceTile>
        </View>
      </View>
    </ScrollView>
  );
}

/** Estado de carga de Resumen -- misma forma que el contenido real (triple
 * de "Este mes", card de "Programado", grilla de "De un vistazo") en vez de
 * un spinner centrado que deja la pantalla en blanco hasta que llega el
 * dato. El número de tiles de la grilla es aproximado (no se sabe todavía
 * si va a haber tarjeta de crédito) -- una vez llega el dato real, el
 * layout se acomoda solo; es lo esperable de un skeleton, no hace falta que
 * sea pixel-perfect. */
function ResumenSkeleton() {
  return (
    <>
      <View className="gap-2">
        <Skeleton width={70} height={11} radius={4} />
        <View className="flex-row gap-3">
          <Skeleton height={54} radius={16} className="flex-1" />
          <Skeleton height={54} radius={16} className="flex-1" />
          <Skeleton height={54} radius={16} className="flex-1" />
        </View>
      </View>
      <Skeleton height={132} radius={14} />
      <View className="gap-1.5">
        <Skeleton width={90} height={11} radius={4} />
        <View className="-m-1.5 flex-row flex-wrap">
          <View className="w-1/2 p-1.5">
            <Skeleton height={84} radius={26} />
          </View>
          <View className="w-1/2 p-1.5">
            <Skeleton height={84} radius={26} />
          </View>
          <View className="w-full p-1.5">
            <Skeleton height={72} radius={26} />
          </View>
        </View>
      </View>
    </>
  );
}

function GlanceTile({
  icon,
  label,
  wide = false,
  onPress,
  children,
}: {
  icon: IconName;
  label: string;
  /** Ocupa la fila completa en vez de la mitad -- para la tile que necesita
   * más lugar (nombre de categoría + monto). */
  wide?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View className={`p-1.5 ${wide ? 'w-full' : 'w-1/2'}`}>
      <Pressable
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="gap-1 rounded-3xl bg-surface-2 p-3.5 active:opacity-60"
      >
        <View className="flex-row items-center justify-between">
          <Icon name={icon} size={15} color={colors.textMuted} />
          <Icon name="chevron-right" size={13} color={colors.textMuted} />
        </View>
        <Text className="text-text-muted mt-1 text-[11px] uppercase tracking-wide">{label}</Text>
        {children}
      </Pressable>
    </View>
  );
}

/** Sufijo para distinguir el tipo de ítem programado -- 'recurring' no
 * necesita uno (es el caso "normal": categoría + cartera solas ya lo dicen). */
function scheduledKindSuffix(kind: ScheduledItem['kind']): string {
  switch (kind) {
    case 'installment':
      return ' · cuota';
    case 'card_payment':
      return ' · pago de tarjeta';
    case 'debt_due':
      return ' · vencimiento';
    default:
      return '';
  }
}

/** Una fila de "Programado" -- la usan tanto la tarjeta de Resumen como el
 * detalle del día en Calendario. `showDate=false` la omite cuando el día ya
 * está implícito (el usuario lo acaba de tocar en la grilla). */
function ScheduledRow({
  item,
  currency,
  showDate = true,
  first = false,
}: {
  item: ScheduledItem;
  currency: string;
  showDate?: boolean;
  first?: boolean;
}) {
  // Un recurrente puede ser income/expense/transfer -- antes se mostraba
  // SIEMPRE en negativo/gris, así que un sueldo recurrente se leía como un
  // gasto más. Una transferencia sigue en gris (sale de esta cartera, mismo
  // criterio que `TransactionRow`); solo el ingreso cambia de signo y color.
  const isIncome = item.type === 'income';
  const title = item.description || item.category_name || 'Programado';
  const a11yLabel = [
    isIncome ? 'Ingreso' : item.type === 'transfer' ? 'Transferencia' : 'Gasto',
    title,
    item.wallet_name,
    formatShortDate(item.date),
    formatMoney(toNumber(item.amount), currency),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        openScheduledItem(item);
      }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      className={`flex-row items-center gap-3 py-2.5 active:opacity-60 ${first ? '' : 'border-t border-border/60'}`}
    >
      {showDate ? (
        <View className="w-12">
          <Text className="text-text-muted text-xs">{formatShortDate(item.date)}</Text>
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="text-text text-sm" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-text-muted text-xs" numberOfLines={1}>
          {item.wallet_name}
          {scheduledKindSuffix(item.kind)}
        </Text>
      </View>
      <Money
        value={isIncome ? toNumber(item.amount) : -toNumber(item.amount)}
        currency={currency}
        parens
        tone={isIncome ? 'income' : 'muted'}
        className="text-sm"
      />
    </Pressable>
  );
}

function ScheduledCard({
  items,
  loading,
  currency,
}: {
  items: ScheduledItem[];
  loading: boolean;
  currency: string;
}) {
  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <Card title="Programado">
      {items.map((it, i) => (
        <ScheduledRow key={`${it.kind}-${it.source_id}-${it.date}`} item={it} currency={currency} first={i === 0} />
      ))}
    </Card>
  );
}

/** Abre "Agregar transacción" con los datos del ítem ya cargados -- el
 * recurrente/cuota de origen no se toca, esto solo ahorra tipear al
 * registrarlo a mano. Se prellena con `it.type` (income/expense/transfer),
 * no siempre "expense": un recurrente puede ser cualquiera de los 3. */
function openScheduledItem(it: ScheduledItem) {
  // Pago de tarjeta o vencimiento de deuda: no hay forma de adivinar bien
  // "expense o transfer, desde qué cartera" (a diferencia de un recurrente,
  // que ya trae las dos carteras si es un aporte automático) -- se manda a
  // la cartera misma, con su saldo y su link a la calculadora correspondiente
  // (ver WalletForm), y ahí el usuario registra el pago como prefiera.
  if (it.kind === 'card_payment' || it.kind === 'debt_due') {
    router.push(`/wallet/${it.source_id}`);
    return;
  }

  const params: Record<string, string> = {
    prefillType: it.type,
    prefillWallet: it.wallet,
    prefillAmount: it.amount,
    prefillDate: it.date,
  };
  if (it.to_wallet) params.prefillToWallet = it.to_wallet;
  if (it.category) params.prefillCategory = it.category;
  if (it.description) params.prefillNote = it.description;

  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  router.push(`/transaction/new?${qs}`);
}

// ---------------------------------------------------------------------------
// Lista (movimientos del mes, agrupados por día)
// ---------------------------------------------------------------------------
type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';

function ListaTab({
  month,
  onMonth,
  currency,
}: {
  month: ReturnType<typeof currentYearMonth>;
  onMonth: (m: ReturnType<typeof currentYearMonth>) => void;
  /** Moneda base del workspace (ver Workspace.base_currency). */
  currency: string;
}) {
  const colors = useColors();
  const range = useMemo(() => monthRange(month), [month]);

  const [search, setSearch] = useState('');
  // Con texto de búsqueda el buscador deja de limitarse al mes visible y
  // pasa a buscar en TODAS las transacciones (pedido explícito: "El
  // buscador debería ser de todas las transacciones, no solo las del
  // mes"). Se debounce para no disparar un fetch por cada tecla.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const searching = debouncedSearch.length > 0;

  const txQuery = useTransactions(
    searching
      ? { search: debouncedSearch }
      : { date_after: range.from, date_before: range.to },
  );
  const walletsQuery = useWallets();
  const tagsQuery = useTags();
  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();
  const { pendingDeleteIds, onSwipeDelete } = useSwipeDeleteTransactions();

  // El aviso de "busca en todo, no sólo el mes" se ve unos segundos la
  // primera vez que alguien busca, y nunca más (ver `store/ui.ts`).
  const hasSeenSearchAllHint = useUIStore((s) => s.hasSeenSearchAllHint);
  const dismissSearchAllHint = useUIStore((s) => s.dismissSearchAllHint);
  const searchingForFirstTime = search.trim().length > 0 && !hasSeenSearchAllHint;
  useEffect(() => {
    if (!searchingForFirstTime) return;
    const t = setTimeout(dismissSearchAllHint, 3000);
    return () => clearTimeout(t);
  }, [searchingForFirstTime, dismissSearchAllHint]);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [walletFilter, setWalletFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [amountMin, setAmountMin] = useState('0.00');
  const [amountMax, setAmountMax] = useState('0.00');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Cuántos filtros avanzados (aparte del texto, que ya se ve en su propio
  // campo) están activos -- para el numerito sobre el ícono. El tipo ahora
  // vive dentro de este mismo panel, así que cuenta acá también.
  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (walletFilter ? 1 : 0) +
    (tagFilter ? 1 : 0) +
    (toNumber(amountMin) > 0 ? 1 : 0) +
    (toNumber(amountMax) > 0 ? 1 : 0);

  function clearAdvancedFilters() {
    haptics.tap();
    setTypeFilter('all');
    setWalletFilter(null);
    setTagFilter(null);
    setAmountMin('0.00');
    setAmountMax('0.00');
  }

  const allItems = txQuery.data ?? [];
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = toNumber(amountMin);
    const max = toNumber(amountMax);
    return allItems.filter((t) => {
      if (pendingDeleteIds.has(t.id)) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (walletFilter && t.wallet !== walletFilter) return false;
      if (tagFilter && !(t.tags ?? []).some((tag) => tag.id === tagFilter)) return false;
      const amount = toNumber(t.amount);
      if (min > 0 && amount < min) return false;
      if (max > 0 && amount > max) return false;
      if (!q) return true;
      const cat = t.category ? categories.get(t.category)?.name : undefined;
      const haystack = `${t.description ?? ''} ${cat ?? ''} ${wallets.get(t.wallet)?.name ?? ''}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [
    allItems,
    pendingDeleteIds,
    typeFilter,
    walletFilter,
    tagFilter,
    amountMin,
    amountMax,
    search,
    categories,
    wallets,
  ]);

  // El total de arriba se suma sin convertir (no hay tasas acá) -- se
  // limita a la moneda base para no mezclar montos de otras carteras; cada
  // fila de la lista de abajo sí muestra su moneda real, sea cual sea.
  const totals = useMemo(
    () => summarizeByType(items.filter((t) => t.currency === currency)),
    [items, currency],
  );
  const days = useMemo(() => groupByDay(items), [items]);

  const refresh = usePullRefresh(txQuery.isFetching && !txQuery.isLoading, () => txQuery.refetch());

  return (
    <ScrollView
      contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-3"
      refreshControl={refresh}
      keyboardShouldPersistTaps="handled"
    >
      <MonthSwitcher value={month} onChange={onMonth} />
      <SummaryTriple income={totals.income} expenses={totals.expenses} currency={currency} />

      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <SearchField value={search} onChange={setSearch} placeholder="Buscar movimientos" />
        </View>
        <Pressable
          onPress={() => {
            haptics.tap();
            setFiltersOpen((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityLabel="Más filtros"
          accessibilityState={{ selected: filtersOpen }}
          className={`h-11 w-11 items-center justify-center rounded-full ${
            filtersOpen || activeFilterCount > 0 ? 'bg-primary' : 'bg-surface-2'
          } active:opacity-70`}
        >
          <Icon
            name="filter"
            size={16}
            color={filtersOpen || activeFilterCount > 0 ? colors.primaryFg : colors.textMuted}
          />
          {activeFilterCount > 0 ? (
            <View className="bg-expense absolute -right-0.5 -top-0.5 h-4 w-4 items-center justify-center rounded-full">
              <Text className="text-[9px] font-bold text-white">{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {searching && searchingForFirstTime ? (
        <Text className="text-text-muted -mt-1 text-xs">
          Buscando en todos tus movimientos, no solo en el mes visible.
        </Text>
      ) : null}

      {filtersOpen ? (
        <FadeInView>
          <View className="gap-3 rounded-2xl border border-border/60 bg-surface p-3">
            <View className="gap-1.5">
              <Text className="text-text-muted text-xs uppercase tracking-wide">Tipo</Text>
              <Segmented
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'Todas' },
                  { value: 'income', label: 'Ingresos' },
                  { value: 'expense', label: 'Gastos' },
                  { value: 'transfer', label: 'Transfer.' },
                ]}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-text-muted text-xs uppercase tracking-wide">Cartera</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                <FilterChip
                  group="Cartera"
                  label="Todas"
                  active={!walletFilter}
                  onPress={() => setWalletFilter(null)}
                />
                {(walletsQuery.data ?? []).map((w) => (
                  <FilterChip
                    key={w.id}
                    group="Cartera"
                    label={w.name}
                    active={walletFilter === w.id}
                    onPress={() => setWalletFilter(walletFilter === w.id ? null : w.id)}
                  />
                ))}
              </ScrollView>
            </View>

            {(tagsQuery.data?.length ?? 0) > 0 ? (
              <View className="gap-1.5">
                <Text className="text-text-muted text-xs uppercase tracking-wide">Etiqueta</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                  <FilterChip
                    group="Etiqueta"
                    label="Todas"
                    active={!tagFilter}
                    onPress={() => setTagFilter(null)}
                  />
                  {(tagsQuery.data ?? []).map((t) => (
                    <FilterChip
                      key={t.id}
                      group="Etiqueta"
                      label={t.name}
                      active={tagFilter === t.id}
                      onPress={() => setTagFilter(tagFilter === t.id ? null : t.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <AmountInput label="Monto mín." currency={currency} value={amountMin} onChangeText={setAmountMin} />
              </View>
              <View className="flex-1">
                <AmountInput label="Monto máx." currency={currency} value={amountMax} onChangeText={setAmountMax} />
              </View>
            </View>

            {activeFilterCount > 0 ? (
              <Pressable
                onPress={clearAdvancedFilters}
                accessibilityRole="button"
                className="items-center py-1 active:opacity-60"
              >
                <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                  Limpiar filtros
                </Text>
              </Pressable>
            ) : null}
          </View>
        </FadeInView>
      ) : null}

      {txQuery.isLoading ? (
        <LoadingState />
      ) : txQuery.isError ? (
        <ErrorState error={txQuery.error} onRetry={txQuery.refetch} />
      ) : allItems.length === 0 ? (
        <EmptyState title="Sin movimientos este mes" hint="Agrega uno con el botón +." />
      ) : items.length === 0 ? (
        <EmptyState title="Sin resultados" hint="Probá con otro texto o filtro." />
      ) : (
        days.map((day, di) => {
          // Mismo criterio que el total del mes: solo suma lo que ya está en
          // la moneda base, para no mezclar montos de otras carteras.
          const dayNet = summarizeByType(day.data.filter((t) => t.currency === currency)).net;
          // Antes cada día entraba con un fundido escalonado (`FadeInView
          // index={di}`) -- se sentía bien la primera vez, pero esta lista
          // se re-renderiza todo el tiempo (cambiar de mes, filtrar, volver
          // de otra pestaña), así que terminaba "titilando" en vez de verse
          // pulido. Se muestra directo.
          return (
            <View key={day.date}>
              <DayHeader date={day.date} net={dayNet} currency={currency} />
              <View className="overflow-hidden rounded-3xl border border-border/60 bg-surface/95 px-4">
                {day.data.map((item, i) => (
                  <View key={item.id}>
                    {i > 0 ? <View className="h-px bg-border/30" /> : null}
                    <TransactionRow
                      txn={item}
                      category={item.category ? categories.get(item.category) : undefined}
                      wallet={wallets.get(item.wallet)}
                      toWallet={item.to_wallet ? wallets.get(item.to_wallet) : undefined}
                      onPress={() => router.push(`/transaction/${item.id}`)}
                      onSwipeDelete={() => onSwipeDelete(item.id)}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

/** Pastilla de una sola opción para el panel de filtros avanzados (cartera o etiqueta). */
function FilterChip({
  group,
  label,
  active,
  onPress,
}: {
  /** Distingue el `accessibilityLabel` cuando dos grupos comparten una
   * etiqueta (p. ej. "Todas" aparece en Cartera y en Etiqueta). */
  group: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${group}: ${label}`}
      accessibilityState={{ selected: active }}
      className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
        active ? 'border-primary bg-primary' : 'border-border bg-surface-2'
      }`}
    >
      <Text className={active ? 'text-primary-fg text-xs font-semibold' : 'text-text-muted text-xs'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Calendario: grilla de mes -- días pasados/hoy = transacciones reales ya
// registradas, días futuros = lo programado (recurrentes, cuotas, pago de
// tarjeta, vencimientos) sin registrar todavía. Sin modelo nuevo: sólo junta
// dos fuentes que ya existían cada una por su lado (Lista y "Programado").
// ---------------------------------------------------------------------------
function CalendarTab({ currency }: { currency: string }) {
  const [month, setMonth] = useState(currentYearMonth);
  const [selected, setSelected] = useState(todayISO);
  const today = todayISO();

  const range = useMemo(() => monthRange(month), [month]);
  const txQuery = useTransactions({ date_after: range.from, date_before: range.to });
  // Nunca antes de hoy (lo pasado ya es transacción real, no "programado").
  // Si el mes visible ya terminó por completo esto queda since > until -- el
  // backend simplemente no devuelve nada, no hace falta un caso aparte.
  const scheduledSince = range.from > today ? range.from : today;
  const scheduledQuery = useScheduled({ since: scheduledSince, until: range.to });

  const { map: categories } = useCategoryMap();
  const { map: wallets } = useWalletMap();

  // `useMemo` (no un `?? []` suelto) para que la referencia sea estable
  // entre renders y no invalide los `useMemo` de abajo en cada uno.
  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data]);
  const scheduled = useMemo(() => scheduledQuery.data ?? [], [scheduledQuery.data]);

  const markers = useMemo(() => {
    const map: Record<string, DayMarker> = {};
    const at = (date: string) => (map[date] ??= { income: false, expense: false, scheduled: false });
    for (const t of transactions) {
      if (t.type === 'income') at(t.date).income = true;
      else if (t.type === 'expense') at(t.date).expense = true;
      // las transferencias no marcan punto: no son ni ingreso ni gasto
    }
    for (const s of scheduled) at(s.date).scheduled = true;
    return map;
  }, [transactions, scheduled]);

  const dayTransactions = useMemo(
    () => transactions.filter((t) => t.date === selected),
    [transactions, selected],
  );
  const dayScheduled = useMemo(() => scheduled.filter((s) => s.date === selected), [scheduled, selected]);

  const loading = txQuery.isLoading || scheduledQuery.isLoading;
  const refresh = usePullRefresh(
    (txQuery.isFetching || scheduledQuery.isFetching) && !loading,
    () => {
      txQuery.refetch();
      scheduledQuery.refetch();
    },
  );

  function onMonth(next: ReturnType<typeof currentYearMonth>) {
    setMonth(next);
    // Si el día elegido no cae en el mes nuevo (p. ej. estabas en el 31 y el
    // mes nuevo no lo tiene), la selección salta a hoy (si el mes nuevo lo
    // contiene) o si no al 1°.
    const nextRange = monthRange(next);
    setSelected(nextRange.from <= today && today <= nextRange.to ? today : nextRange.from);
  }

  return (
    <ScrollView
      contentContainerClassName="px-4 pb-36 pt-4 self-center w-full max-w-[560px] gap-4"
      refreshControl={refresh}
    >
      <MonthSwitcher value={month} onChange={onMonth} />

      {loading ? (
        <LoadingState />
      ) : txQuery.isError ? (
        <ErrorState error={txQuery.error} onRetry={txQuery.refetch} />
      ) : (
        <>
          <Card>
            <CalendarGrid month={month} selected={selected} markers={markers} onSelectDay={setSelected} />
          </Card>

          <View className="gap-1">
            <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide">
              {formatDayHeader(selected)}
            </Text>
            {dayTransactions.length === 0 && dayScheduled.length === 0 ? (
              <Text className="text-text-muted py-6 text-center text-sm">Sin movimientos este día.</Text>
            ) : (
              <View className="overflow-hidden rounded-3xl border border-border/60 bg-surface/95 px-4">
                {dayTransactions.map((item, i) => (
                  <View key={item.id}>
                    {i > 0 ? <View className="h-px bg-border/30" /> : null}
                    <TransactionRow
                      txn={item}
                      category={item.category ? categories.get(item.category) : undefined}
                      wallet={wallets.get(item.wallet)}
                      toWallet={item.to_wallet ? wallets.get(item.to_wallet) : undefined}
                      onPress={() => router.push(`/transaction/${item.id}`)}
                    />
                  </View>
                ))}
                {dayScheduled.map((it, i) => (
                  <View key={`${it.kind}-${it.source_id}`}>
                    {dayTransactions.length > 0 || i > 0 ? <View className="h-px bg-border/30" /> : null}
                    <ScheduledRow item={it} currency={currency} showDate={false} first />
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
