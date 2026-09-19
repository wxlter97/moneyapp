import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  useCategories,
  useConfirmEmailImport,
  useEmailImportLog,
  useModuleDisabled,
  useWallets,
} from '@/api/queries';
import { walletLabel } from '@/api/queries/lookups';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { CategoryType } from '@/api/types';
import { CategoryPickerField } from '@/components/CategoryGrid';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { dismissModal, ModalHeader } from '@/components/ui/ModalHeader';
import { PickerRow } from '@/components/ui/PickerRow';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { todayISO } from '@/lib/date';
import { toNumber } from '@/lib/money';
import { isPlanUpgradeError } from '@/lib/planErrors';

type OpenRow = 'category' | 'wallet' | null;

/**
 * Confirma una candidata de importación bancaria: hay que elegir categoría
 * (el correo no la trae) y se puede corregir cartera/monto/fecha/descripción
 * antes de crear la Transaction real.
 */
export default function ConfirmImportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const logQ = useEmailImportLog(id);
  const walletsQ = useWallets();
  const categoriesQ = useCategories();
  const confirm = useConfirmEmailImport();
  const disabledMessage = useModuleDisabled('email_import');

  const [type, setType] = useState<CategoryType>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [openRow, setOpenRow] = useState<OpenRow>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (prefilled || !logQ.data || !walletsQ.data) return;
    const log = logQ.data;
    setWalletId(log.wallet ?? walletsQ.data.find((w) => w.purpose === 'spending')?.id ?? null);
    if (log.extracted_amount) setAmount(toNumber(log.extracted_amount).toFixed(2));
    if (log.extracted_date) setDate(log.extracted_date);
    setDescription(log.extracted_merchant || log.raw_email_subject || '');
    // Adivinada por comercio (ver `suggested_category` en el backend) --
    // igual la puede cambiar antes de confirmar, esto solo ahorra el toque.
    if (log.suggested_category) setCategoryId(log.suggested_category);
    setPrefilled(true);
  }, [prefilled, logQ.data, walletsQ.data]);

  const walletOptions = (walletsQ.data ?? []).map((w) => ({ value: w.id, label: walletLabel(w) }));

  const amountNum = Number(amount.replace(',', '.'));
  const canSubmit =
    Number.isFinite(amountNum) && amountNum > 0 && !!walletId && !!categoryId && !disabledMessage;

  async function onSubmit() {
    if (!id || !categoryId || !walletId) return;
    setFormError(null);
    setFields({});
    try {
      await confirm.mutateAsync({
        id,
        input: {
          category: categoryId,
          wallet: walletId,
          amount: amountNum.toFixed(2),
          date,
          description: description.trim(),
        },
      });
      haptics.success();
      dismissModal();
    } catch (err) {
      haptics.error();
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo confirmar la importación.'));
    }
  }

  if (logQ.isLoading || !prefilled) return <LoadingState />;

  const log = logQ.data;

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Confirmar importación" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
          {log ? (
            <View className="gap-0.5 rounded-2xl bg-surface-2 px-4 py-3">
              <Text className="text-text-muted text-xs">Del correo</Text>
              <Text className="text-text text-sm" numberOfLines={2}>
                {log.raw_email_subject || 'Sin asunto'}
                {log.bank_name ? ` · ${log.bank_name}` : ''}
              </Text>
            </View>
          ) : null}

          {disabledMessage ? <Text className="text-warning text-sm">{disabledMessage}</Text> : null}
          {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}
          {isPlanUpgradeError(formError) ? (
            <Button label="Pasate a Pro" variant="ghost" onPress={() => router.push('/pro')} />
          ) : null}

          <Segmented
            value={type}
            onChange={(v) => {
              setType(v);
              setCategoryId(null);
            }}
            options={[
              { value: 'expense', label: 'Gasto' },
              { value: 'income', label: 'Ingreso' },
            ]}
          />

          <View className="gap-1">
            <CategoryPickerField
              categories={categoriesQ.data ?? []}
              type={type}
              value={categoryId}
              open={openRow === 'category'}
              onToggle={() => setOpenRow((r) => (r === 'category' ? null : 'category'))}
              onChange={(v) => {
                setCategoryId(v || null);
                setOpenRow(null);
              }}
              loading={categoriesQ.isLoading}
              error={fields.category}
            />
            {log?.suggested_category_name && categoryId === log.suggested_category ? (
              <Text className="text-text-muted text-xs">
                Sugerida por compras anteriores en "{log.extracted_merchant}"
              </Text>
            ) : null}

            <PickerRow
              label="Cartera"
              options={walletOptions}
              value={walletId}
              onChange={(v) => {
                setWalletId(v);
                setOpenRow(null);
              }}
              open={openRow === 'wallet'}
              onToggle={() => setOpenRow((r) => (r === 'wallet' ? null : 'wallet'))}
              placeholder={walletsQ.isLoading ? 'Cargando…' : 'Elegir'}
              error={fields.wallet}
            />
          </View>

          <TextField
            label="Monto"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            error={fields.amount}
          />

          <DateField label="Fecha" value={date} onChange={setDate} maxToday />

          <TextField
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            placeholder="Comercio o motivo"
            error={fields.description}
          />

          <Button label="Confirmar e importar" disabled={!canSubmit} loading={confirm.isPending} onPress={onSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
