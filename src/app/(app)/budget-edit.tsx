import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import {
  useBudgetReport,
  useCategories,
  useCategoryBudgets,
  useCreateCategoryBudget,
  useDeleteCategoryBudget,
  useUpdateCategoryBudget,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { Category } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { dismissModal, ModalHeader } from '@/components/ui/ModalHeader';
import { Money } from '@/components/ui/Money';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';
import { fonts } from '@/theme/typography';
import { currentYearMonth, formatYearMonth, type YearMonth } from '@/lib/date';
import { toNumber } from '@/lib/money';

function parseAmount(raw: string): number {
  const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export default function BudgetEditScreen() {
  const params = useLocalSearchParams<{ y?: string; m?: string }>();
  const ym: YearMonth = useMemo(() => {
    const y = Number(params.y);
    const m = Number(params.m);
    return y && m ? { year: y, month: m } : currentYearMonth();
  }, [params.y, params.m]);

  const categoriesQ = useCategories();
  const budgetsQ = useCategoryBudgets(ym);
  const reportQ = useBudgetReport(ym);
  const create = useCreateCategoryBudget();
  const update = useUpdateCategoryBudget();
  const remove = useDeleteCategoryBudget();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const groups = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => c.type === 'expense' && c.parent === null)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [categoriesQ.data],
  );

  // Presupuesto vigente por categoría-grupo para el mes elegido.
  const existingByCat = useMemo(() => {
    const map = new Map<string, { id: string; amount: string }>();
    for (const b of budgetsQ.data ?? []) map.set(b.category, { id: b.id, amount: b.amount });
    return map;
  }, [budgetsQ.data]);

  // Gasto real por grupo (para orientar el monto).
  const spentByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of reportQ.data?.groups ?? []) {
      if (g.group) map.set(g.group, toNumber(g.spent));
    }
    return map;
  }, [reportQ.data]);

  const busy = create.isPending || update.isPending || remove.isPending;
  const loading = categoriesQ.isLoading || budgetsQ.isLoading;

  function valueFor(groupId: string): string {
    if (groupId in draft) return draft[groupId];
    const cur = existingByCat.get(groupId);
    return cur ? toNumber(cur.amount).toFixed(2) : '';
  }

  const dirty = useMemo(() => {
    return groups.some((g) => {
      if (!(g.id in draft)) return false;
      const next = parseAmount(draft[g.id]);
      const cur = existingByCat.get(g.id);
      const curNum = cur ? toNumber(cur.amount) : 0;
      return next !== curNum;
    });
  }, [draft, groups, existingByCat]);

  async function onSave() {
    setFormError(null);
    const ops: Promise<unknown>[] = [];
    for (const g of groups) {
      if (!(g.id in draft)) continue;
      const next = parseAmount(draft[g.id]);
      const cur = existingByCat.get(g.id);
      const curNum = cur ? toNumber(cur.amount) : 0;
      if (next === curNum) continue;

      if (cur && next <= 0) {
        ops.push(remove.mutateAsync(cur.id));
      } else if (cur) {
        ops.push(update.mutateAsync({ id: cur.id, input: { amount: next.toFixed(2) } }));
      } else if (next > 0) {
        ops.push(
          create.mutateAsync({
            category: g.id,
            amount: next.toFixed(2),
            month: ym.month,
            year: ym.year,
          }),
        );
      }
    }
    try {
      await Promise.all(ops);
      dismissModal();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudieron guardar los presupuestos.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={`Presupuesto · ${formatYearMonth(ym)}`} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {loading ? (
          <LoadingState />
        ) : groups.length === 0 ? (
          <Text className="text-text-muted py-6 text-center text-sm">
            Primero crea grupos de gasto en Herramientas → Categorías.
          </Text>
        ) : (
          <>
            <ScrollView
              contentContainerClassName="gap-1 py-2"
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-text-muted px-1 pb-2 text-xs">
                Monto mensual por grupo. Deja en blanco (o 0) para quitarlo.
              </Text>
              {groups.map((g) => (
                <GroupRow
                  key={g.id}
                  group={g}
                  value={valueFor(g.id)}
                  spent={spentByGroup.get(g.id) ?? 0}
                  onChange={(text) => setDraft((d) => ({ ...d, [g.id]: text }))}
                />
              ))}
            </ScrollView>

            {formError ? (
              <Text className="text-expense px-1 pb-2 text-sm">{formError}</Text>
            ) : null}
            <View className="pb-4 pt-2">
              <Button
                label="Guardar"
                loading={busy}
                disabled={!dirty || busy}
                onPress={onSave}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function GroupRow({
  group,
  value,
  spent,
  onChange,
}: {
  group: Category;
  value: string;
  spent: number;
  onChange: (text: string) => void;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-border/25 py-2.5">
      <CategoryAvatar icon={group.icon} color={group.color} size={36} />
      <View className="flex-1">
        <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {group.name}
        </Text>
        {spent > 0 ? (
          <Text className="text-text-muted text-[11px]">
            gastado <Money value={spent} tone="muted" />
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-1 rounded-xl bg-surface-2 px-2.5">
        <Text className="text-text-muted text-sm">$</Text>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#6B7480"
          style={{ width: 84, minWidth: 0 }}
          className="text-text h-10 text-right text-base"
        />
      </View>
    </View>
  );
}
