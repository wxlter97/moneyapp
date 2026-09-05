import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import {
  useBudgetReport,
  useCategories,
  useCategoryBudgets,
  useDeleteCategoryBudget,
  useSetForwardCategoryBudget,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { Category } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { CategoryAvatar } from '@/components/ui/CategoryAvatar';
import { Icon } from '@/components/ui/Icon';
import { dismissModal, ModalHeader } from '@/components/ui/ModalHeader';
import { Money } from '@/components/ui/Money';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';
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
  const setForward = useSetForwardCategoryBudget();
  const remove = useDeleteCategoryBudget();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [addedSubcats, setAddedSubcats] = useState<Set<string>>(new Set());
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const groups = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => c.type === 'expense' && c.parent === null)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [categoriesQ.data],
  );

  // Presupuesto vigente por categoría (grupo o subcategoría) para el mes elegido.
  const existingByCat = useMemo(() => {
    const map = new Map<string, { id: string; amount: string }>();
    for (const b of budgetsQ.data ?? []) map.set(b.category, { id: b.id, amount: b.amount });
    return map;
  }, [budgetsQ.data]);

  // Gasto real por categoría (para orientar el monto).
  const spentByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of reportQ.data?.groups ?? []) {
      if (g.group) map.set(g.group, toNumber(g.spent));
      for (const r of g.rows) map.set(r.category, toNumber(r.spent));
    }
    return map;
  }, [reportQ.data]);

  const subcatsByGroup = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categoriesQ.data ?? []) {
      if (c.type !== 'expense' || c.parent === null) continue;
      const list = map.get(c.parent) ?? [];
      list.push(c);
      map.set(c.parent, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    }
    return map;
  }, [categoriesQ.data]);

  // Filas visibles: siempre los grupos + las subcategorías que ya tienen
  // presupuesto guardado o que el usuario agregó en esta sesión. Así no
  // mostramos la lista completa de subcategorías de entrada.
  const shownSubcatsByGroup = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const [groupId, subcats] of subcatsByGroup) {
      map.set(
        groupId,
        subcats.filter((s) => existingByCat.has(s.id) || addedSubcats.has(s.id)),
      );
    }
    return map;
  }, [subcatsByGroup, existingByCat, addedSubcats]);

  const allRows = useMemo(() => {
    const rows: Category[] = [];
    for (const g of groups) {
      rows.push(g);
      rows.push(...(shownSubcatsByGroup.get(g.id) ?? []));
    }
    return rows;
  }, [groups, shownSubcatsByGroup]);

  function valueFor(catId: string): string {
    if (catId in draft) return draft[catId];
    const cur = existingByCat.get(catId);
    return cur ? toNumber(cur.amount).toFixed(2) : '';
  }

  const dirty = useMemo(() => {
    return allRows.some((c) => {
      if (!(c.id in draft)) return false;
      const next = parseAmount(draft[c.id]);
      const cur = existingByCat.get(c.id);
      const curNum = cur ? toNumber(cur.amount) : 0;
      return next !== curNum;
    });
  }, [draft, allRows, existingByCat]);

  const busy = setForward.isPending || remove.isPending;
  const loading = categoriesQ.isLoading || budgetsQ.isLoading;

  async function onSave() {
    setFormError(null);
    const ops: Promise<unknown>[] = [];
    for (const c of allRows) {
      if (!(c.id in draft)) continue;
      const next = parseAmount(draft[c.id]);
      const cur = existingByCat.get(c.id);
      const curNum = cur ? toNumber(cur.amount) : 0;
      if (next === curNum) continue;

      if (cur && next <= 0) {
        ops.push(remove.mutateAsync(cur.id));
      } else if (next > 0) {
        ops.push(
          setForward.mutateAsync({
            category: c.id,
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
                Monto mensual por grupo (o por subcategoría puntual). Se aplica también a los
                próximos meses, hasta que edites uno distinto. Deja en blanco (o 0) para quitarlo
                de este mes.
              </Text>
              {groups.map((g) => {
                const shownSubcats = shownSubcatsByGroup.get(g.id) ?? [];
                const availableSubcats = (subcatsByGroup.get(g.id) ?? []).filter(
                  (s) => !existingByCat.has(s.id) && !addedSubcats.has(s.id),
                );
                return (
                  <View key={g.id}>
                    <BudgetRow
                      category={g}
                      value={valueFor(g.id)}
                      spent={spentByCat.get(g.id) ?? 0}
                      onChange={(text) => setDraft((d) => ({ ...d, [g.id]: text }))}
                    />
                    {shownSubcats.map((s) => (
                      <BudgetRow
                        key={s.id}
                        category={s}
                        indent
                        value={valueFor(s.id)}
                        spent={spentByCat.get(s.id) ?? 0}
                        onChange={(text) => setDraft((d) => ({ ...d, [s.id]: text }))}
                        onRemove={() => {
                          setAddedSubcats((set) => {
                            const next = new Set(set);
                            next.delete(s.id);
                            return next;
                          });
                          setDraft((d) => ({ ...d, [s.id]: '0' }));
                        }}
                      />
                    ))}
                    {availableSubcats.length > 0 ? (
                      <AddSubcategoryRow
                        options={availableSubcats}
                        open={openPickerFor === g.id}
                        onToggle={() =>
                          setOpenPickerFor((cur) => (cur === g.id ? null : g.id))
                        }
                        onPick={(catId) => {
                          haptics.selection();
                          setAddedSubcats((set) => new Set(set).add(catId));
                          setOpenPickerFor(null);
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
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

function BudgetRow({
  category,
  value,
  spent,
  onChange,
  indent = false,
  onRemove,
}: {
  category: Category;
  value: string;
  spent: number;
  onChange: (text: string) => void;
  indent?: boolean;
  onRemove?: () => void;
}) {
  const colors = useColors();
  return (
    <View
      className={`flex-row items-center gap-3 border-b border-border/25 py-2.5 ${
        indent ? 'pl-8' : ''
      }`}
    >
      <CategoryAvatar icon={category.icon} color={category.color} size={indent ? 30 : 36} />
      <View className="flex-1">
        <Text
          className="text-text text-base"
          style={{ fontFamily: fonts.semibold }}
          numberOfLines={1}
        >
          {category.name}
        </Text>
        {spent > 0 ? (
          <Text className="text-text-muted text-[11px]">
            gastado <Money value={spent} tone="muted" />
          </Text>
        ) : null}
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Quitar">
          <Icon name="close" size={14} color={colors.textMuted} />
        </Pressable>
      ) : null}
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

function AddSubcategoryRow({
  options,
  open,
  onToggle,
  onPick,
}: {
  options: Category[];
  open: boolean;
  onToggle: () => void;
  onPick: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View className="pb-2 pl-8 pt-1">
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        className="flex-row items-center gap-1.5 self-start active:opacity-70"
      >
        <Icon name={open ? 'chevron-up' : 'plus'} size={13} color={colors.primary} />
        <Text className="text-primary text-xs" style={{ fontFamily: fonts.semibold }}>
          Agregar subcategoría
        </Text>
      </Pressable>
      {open ? (
        <View className="mt-2 overflow-hidden rounded-xl border border-border bg-surface">
          <ScrollView className="max-h-48" nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => onPick(s.id)}
                className="flex-row items-center gap-2.5 px-3 py-2.5 active:bg-surface-2"
              >
                <CategoryAvatar icon={s.icon} color={s.color} size={24} />
                <Text className="text-text flex-1 text-sm" numberOfLines={1}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
