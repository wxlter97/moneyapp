import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useCanAfford, useCategories, useWallets } from '@/api/queries';
import type { CanAfford } from '@/api/types';
import { CategoryGrid } from '@/components/CategoryGrid';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/states';
import { formatShortDate, todayISO } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { useWorkspaceStore } from '@/store/workspace';
import { fonts } from '@/theme/typography';

const VERDICT: Record<CanAfford['verdict'], { title: string; className: string }> = {
  ok: { title: 'Te alcanza', className: 'bg-income/10' },
  tight: { title: 'Te alcanza, pero justo', className: 'bg-warning/10' },
  over: { title: 'No te alcanza', className: 'bg-expense/10' },
};

/**
 * "¿Me alcanza?": antes de comprar algo, cómo quedarían la categoría y el
 * presupuesto del período. No crea nada; si la respuesta convence, "Registrar
 * el gasto" abre el formulario con el monto y la categoría ya puestos. Ver
 * `apps.reports.planning.can_afford` en el backend.
 */
export default function CanAffordScreen() {
  const currency = useWorkspaceStore(
    (s) => s.workspaces.find((w) => w.id === s.activeId)?.base_currency ?? 'USD',
  );
  const categoriesQ = useCategories();
  const walletsQ = useWallets();
  // El formulario de alta sólo toma la precarga con una cartera: la de gasto
  // por defecto, o la primera de gasto en la moneda base.
  const spending = (walletsQ.data ?? []).filter(
    (w) => w.purpose === 'spending' && !w.is_archived && w.currency === currency,
  );
  const payWallet = spending.find((w) => w.is_default) ?? spending[0];
  const [amount, setAmount] = useState('');
  const [debounced, setDebounced] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pickingCategory, setPickingCategory] = useState(false);

  // Una consulta por pausa al tipear, no una por dígito.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(amount), 350);
    return () => clearTimeout(t);
  }, [amount]);

  const q = useCanAfford(debounced, categoryId ?? undefined);
  const data = toNumber(debounced) > 0 ? q.data : undefined;
  const category = useMemo(
    () => (categoriesQ.data ?? []).find((c) => c.id === categoryId),
    [categoriesQ.data, categoryId],
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="¿Me alcanza?" />
      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        <Text className="text-text-muted text-sm">
          Poné cuánto vas a gastar y te decimos cómo queda tu presupuesto, contando lo que ya
          tenés programado hasta fin de período.
        </Text>

        <AmountInput label="Monto" value={amount} onChangeText={setAmount} currency={currency} autoFocus />

        <Pressable
          onPress={() => {
            haptics.tap();
            setPickingCategory((v) => !v);
          }}
          className="flex-row items-center justify-between rounded-2xl border border-border px-4 py-3 active:opacity-70"
          accessibilityRole="button"
        >
          <Text className="text-text-muted text-sm">Categoría</Text>
          <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
            {category?.name ?? 'Cualquiera'}
          </Text>
        </Pressable>
        {pickingCategory ? (
          <Card>
            {categoryId ? (
              <Pressable
                onPress={() => {
                  setCategoryId(null);
                  setPickingCategory(false);
                }}
                className="mb-2 self-start active:opacity-60"
                accessibilityRole="button"
              >
                <Text className="text-primary text-sm">Sin categoría en particular</Text>
              </Pressable>
            ) : null}
            <CategoryGrid
              categories={categoriesQ.data ?? []}
              type="expense"
              selectedId={categoryId}
              sortByUsage
              onSelect={(id) => {
                setCategoryId(id);
                setPickingCategory(false);
              }}
            />
          </Card>
        ) : null}

        {q.isError && toNumber(debounced) > 0 ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : data ? (
          <Result data={data} currency={currency} />
        ) : null}

        {data && payWallet ? (
          <Button
            label="Registrar el gasto"
            variant={data.verdict === 'over' ? 'ghost' : 'primary'}
            onPress={() =>
              router.push({
                pathname: '/transaction/new',
                params: {
                  prefillType: 'expense',
                  prefillWallet: payWallet?.id ?? '',
                  prefillAmount: toNumber(amount).toFixed(2),
                  prefillDate: todayISO(),
                  ...(categoryId && { prefillCategory: categoryId }),
                },
              })
            }
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Result({ data, currency }: { data: CanAfford; currency: string }) {
  const verdict = VERDICT[data.verdict];
  const cat = data.category;
  return (
    <View className="gap-3">
      <View className={`gap-1 rounded-2xl px-4 py-3 ${verdict.className}`}>
        <Text className="text-text text-lg" style={{ fontFamily: fonts.bold }}>
          {verdict.title}
        </Text>
        <Text className="text-text-muted text-sm">
          {data.basis === 'budget'
            ? `Quedan ${data.days_left} ${data.days_left === 1 ? 'día' : 'días'} de este período (hasta el ${formatShortDate(data.period_end)}).`
            : 'No tenés presupuesto cargado: lo calculamos con lo que entró y salió este mes.'}
        </Text>
      </View>

      {cat ? (
        <Card title={cat.category_name}>
          {cat.has_budget ? (
            <>
              <Row label="Te queda hoy" value={cat.remaining_before} currency={currency} />
              <Row
                label="Después de esta compra"
                value={cat.remaining_after}
                currency={currency}
                tone={toNumber(cat.remaining_after) < 0 ? 'expense' : 'income'}
                strong
              />
            </>
          ) : (
            <Text className="text-text-muted text-sm">
              Esta categoría no tiene presupuesto: sólo miramos el total.
            </Text>
          )}
        </Card>
      ) : null}

      <Card title={data.basis === 'budget' ? 'Presupuesto del período' : 'Este mes'}>
        <Row label="Disponible hoy" value={data.available_before} currency={currency} />
        {toNumber(data.committed) > 0 ? (
          <Text className="text-text-muted -mt-1 pb-1 text-xs">
            Ya descontamos <Money value={data.committed} currency={currency} tone="muted" className="text-xs" /> de
            recurrentes y cuotas que faltan.
          </Text>
        ) : null}
        <Row
          label="Después de esta compra"
          value={data.available_after}
          currency={currency}
          tone={toNumber(data.available_after) < 0 ? 'expense' : 'income'}
          strong
        />
      </Card>
    </View>
  );
}

function Row({
  label,
  value,
  currency,
  tone = 'default',
  strong = false,
}: {
  label: string;
  value: string;
  currency: string;
  tone?: 'default' | 'income' | 'expense';
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-text-muted text-sm" style={strong ? { fontFamily: fonts.semibold } : undefined}>
        {label}
      </Text>
      <Money value={value} currency={currency} tone={tone} className={`text-sm ${strong ? 'font-bold' : ''}`} />
    </View>
  );
}
