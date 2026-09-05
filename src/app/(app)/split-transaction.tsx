import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useCategories, useSplitTransaction, useTransaction } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import { CategoryPickerField } from '@/components/CategoryGrid';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Money } from '@/components/ui/Money';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/states';
import { TextField } from '@/components/ui/TextField';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

interface PartDraft {
  key: string;
  categoryId: string | null;
  amount: string;
  description: string;
}

let nextKey = 0;
function emptyPart(): PartDraft {
  return { key: String(nextKey++), categoryId: null, amount: '0.00', description: '' };
}

/**
 * Divide una transacción existente en varias partes con categoría y monto
 * propios (p. ej. un super repartido entre "Comida" e "Higiene"). Se llega
 * acá desde "Dividir en varias categorías" al editar una transacción.
 */
export default function SplitTransactionScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const txnQ = useTransaction(id);
  const categoriesQ = useCategories();
  const splitMutation = useSplitTransaction();

  const [parts, setParts] = useState<PartDraft[]>(() => [emptyPart(), emptyPart()]);
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const txn = txnQ.data;
  const total = toNumber(txn?.amount);
  const assigned = parts.reduce((sum, p) => sum + toNumber(p.amount), 0);
  // Redondeo a centavos: comparar floats crudos casi nunca da 0 exacto.
  const remaining = Math.round((total - assigned) * 100) / 100;

  const categoryOptions = useMemo(
    () => (categoriesQ.data ?? []).filter((c) => c.type === txn?.type),
    [categoriesQ.data, txn?.type],
  );

  function updatePart(key: string, patch: Partial<PartDraft>) {
    setParts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function addPart() {
    haptics.tap();
    setParts((prev) => [...prev, emptyPart()]);
  }

  function removePart(key: string) {
    haptics.tap();
    setParts((prev) => (prev.length > 2 ? prev.filter((p) => p.key !== key) : prev));
  }

  const canSubmit =
    !!txn &&
    remaining === 0 &&
    total > 0 &&
    parts.length >= 2 &&
    parts.every((p) => !!p.categoryId && toNumber(p.amount) > 0);

  async function onSubmit() {
    if (!id || !canSubmit) return;
    setError(null);
    try {
      await splitMutation.mutateAsync({
        id,
        parts: parts.map((p) => ({
          category: p.categoryId!,
          amount: toNumber(p.amount).toFixed(2),
          description: p.description.trim() || undefined,
        })),
      });
      haptics.success();
      // No hay a dónde "volver": la transacción original ya no existe (se
      // reemplazó por las partes). router.back() dejaría a la vista la
      // pantalla de editarla, con datos viejos, encima de otro modal.
      router.replace('/dashboard');
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo dividir la transacción.'));
    }
  }

  if (txnQ.isLoading || categoriesQ.isLoading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ModalHeader title="Dividir transacción" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Dividir transacción" />
      <ScrollView contentContainerClassName="gap-3 py-2" keyboardShouldPersistTaps="handled">
        <Card>
          <Text className="text-text-muted text-sm" numberOfLines={1}>
            {txn?.description || 'Transacción'}
          </Text>
          <Money
            value={txn?.amount}
            currency={txn?.currency}
            className="text-2xl font-semibold"
          />
        </Card>

        {parts.map((part, i) => (
          <Card
            key={part.key}
            title={`Parte ${i + 1}`}
            action={
              parts.length > 2 ? (
                <Pressable
                  onPress={() => removePart(part.key)}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar esta parte"
                  className="active:opacity-60"
                >
                  <Icon name="trash" size={16} color={colors.textMuted} />
                </Pressable>
              ) : undefined
            }
          >
            <View className="gap-3">
              <CategoryPickerField
                categories={categoryOptions}
                type={txn?.type === 'income' ? 'income' : 'expense'}
                value={part.categoryId}
                open={openPicker === part.key}
                onToggle={() => setOpenPicker(openPicker === part.key ? null : part.key)}
                onChange={(v) => {
                  updatePart(part.key, { categoryId: v });
                  setOpenPicker(null);
                }}
              />
              <AmountInput
                label="Monto"
                currency={txn?.currency}
                value={part.amount}
                onChangeText={(v) => updatePart(part.key, { amount: v })}
              />
              <TextField
                label="Nota (opcional)"
                placeholder={txn?.description || undefined}
                value={part.description}
                onChangeText={(v) => updatePart(part.key, { description: v })}
              />
            </View>
          </Card>
        ))}

        <Pressable
          onPress={addPart}
          accessibilityRole="button"
          className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 active:opacity-70"
        >
          <Icon name="plus" size={16} color={colors.textMuted} />
          <Text className="text-text-muted text-sm">Agregar otra parte</Text>
        </Pressable>

        <View className="flex-row items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <Text className="text-text-muted text-sm">Falta asignar</Text>
          <Money
            value={remaining.toFixed(2)}
            currency={txn?.currency}
            tone={remaining === 0 ? 'income' : 'expense'}
            className="text-base font-semibold"
          />
        </View>

        {error ? <Text className="text-expense px-1 text-xs">{error}</Text> : null}

        <Button
          label="Dividir"
          loading={splitMutation.isPending}
          disabled={!canSubmit}
          onPress={onSubmit}
        />
      </ScrollView>
    </Screen>
  );
}
