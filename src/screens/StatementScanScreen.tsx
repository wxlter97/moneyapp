import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  useAIStatus,
  useBankEmailSchemas,
  useCategories,
  useImportStatement,
  useLoyaltyBanks,
  useScanStatement,
  useWallets,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type {
  Category,
  StatementCandidate,
  TransactionInput,
  Wallet,
  WalletInput,
} from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { dismissModal } from '@/components/ui/ModalHeader';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { haptics } from '@/lib/haptics';
import { openingBalanceFor } from '@/lib/statementImport';
import { formatMoney, toNumber } from '@/lib/money';
import { pickReceiptDocument, pickReceiptImage, type PickedFile } from '@/lib/receipt';
import { useSnackbarStore } from '@/store/snackbar';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

type Target = 'new' | 'existing';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * "Leer estado de cuenta": sube el PDF/foto del banco, muestra lo que se leyó
 * y crea (con confirmación) la cartera y sus movimientos. La IA propone, nunca
 * crea sola. Vive en `src/screens/` para cargarse bajo demanda.
 */
export default function StatementScanScreen() {
  const colors = useColors();
  const status = useAIStatus();
  const scan = useScanStatement();
  const importer = useImportStatement();
  const walletsQ = useWallets();
  const categoriesQ = useCategories();
  const loyaltyBanksQ = useLoyaltyBanks();
  const schemasQ = useBankEmailSchemas();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [target, setTarget] = useState<Target>('new');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<StatementCandidate | null>(null);
  const [name, setName] = useState('');
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [defaultExpenseCat, setDefaultExpenseCat] = useState<string | null>(null);
  const [defaultIncomeCat, setDefaultIncomeCat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  const wallets = useMemo(
    () => (walletsQ.data ?? []).filter((w) => !w.is_archived),
    [walletsQ.data],
  );
  const existingWallet: Wallet | undefined = wallets.find((w) => w.id === walletId);

  const leafCategories = (type: 'income' | 'expense'): Category[] =>
    (categoriesQ.data ?? []).filter((c) => c.type === type && c.parent !== null);
  const categoryOptions = (type: 'income' | 'expense') =>
    leafCategories(type).map((c) => ({ value: c.id, label: c.name }));

  const quota = status.data?.quotas?.statement ?? status.data?.quotas?.receipt;
  const exhausted = quota?.remaining === 0;

  async function onPick(source: 'camera' | 'library' | 'document') {
    setError(null);
    if (target === 'existing' && !walletId) {
      setError('Elige primero la cartera a la que van los movimientos.');
      return;
    }
    const file: PickedFile | null =
      source === 'document' ? await pickReceiptDocument() : await pickReceiptImage(source);
    if (!file) return;
    try {
      const result = await scan.mutateAsync({
        file,
        wallet: target === 'existing' ? walletId : null,
      });
      haptics.success();
      setCandidate(result);
      setName(result.wallet.name);
      // Los que parecen duplicados de algo ya registrado arrancan sin marcar.
      const dups = new Set<number>();
      result.transactions.forEach((t, i) => {
        if (t.possible_duplicates.length > 0) dups.add(i);
      });
      setExcluded(dups);
    } catch (err) {
      haptics.error();
      setError(
        errorMessage(err, 'No se pudo leer el estado de cuenta. Prueba de nuevo o cárgalo a mano.'),
      );
    }
  }

  function reset() {
    setCandidate(null);
    setError(null);
    setProgress(null);
    setFailedCount(0);
    setExcluded(new Set());
  }

  if (!status.data?.enabled) {
    return (
      <View className="gap-2 py-6">
        <Text className="text-text text-base" style={{ fontFamily: fonts.semibold }}>
          La lectura con IA no está disponible
        </Text>
        <Text className="text-text-muted text-sm">
          Esta función necesita la IA activada en el servidor.
        </Text>
      </View>
    );
  }

  // ---- Paso 1: elegir destino y archivo ---------------------------------
  if (!candidate) {
    return (
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        <Text className="text-text-muted text-sm">
          Sube el estado de cuenta de tu banco (PDF o foto). Leemos los datos y los movimientos; tú
          revisas todo antes de que se cree nada.
        </Text>

        <Segmented<Target>
          value={target}
          onChange={setTarget}
          options={[
            { value: 'new', label: 'Cartera nueva' },
            { value: 'existing', label: 'Cartera existente' },
          ]}
        />

        {target === 'existing' ? (
          <Select
            label="Importar movimientos a"
            value={walletId}
            onChange={setWalletId}
            options={wallets.map((w) => ({ value: w.id, label: w.name }))}
            placeholder="Elige una cartera"
          />
        ) : (
          <Text className="text-text-muted text-xs">
            Se crea una cartera con los datos del estado de cuenta (banco, últimos 4, límite, día de
            corte y de pago…) y se importan sus movimientos.
          </Text>
        )}

        {scan.isPending ? (
          <View className="flex-row items-center justify-center gap-2 rounded-xl bg-surface-2 py-4">
            <ActivityIndicator color={colors.textMuted} size="small" />
            <Text className="text-text-muted text-sm">Leyendo el estado de cuenta… puede tardar.</Text>
          </View>
        ) : (
          <View className="flex-row gap-2">
            {(
              [
                ['document', 'receipt', 'PDF'],
                ['camera', 'camera', 'Tomar foto'],
                ['library', 'image', 'Galería'],
              ] as const
            ).map(([source, icon, label]) => (
              <Pressable
                key={source}
                onPress={() => {
                  if (exhausted) return;
                  haptics.tap();
                  void onPick(source);
                }}
                disabled={exhausted}
                accessibilityRole="button"
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-3 ${
                  exhausted ? 'opacity-50' : 'active:opacity-70'
                }`}
              >
                <Icon name={icon} size={15} color={colors.text} />
                <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {exhausted ? (
          <Text className="text-text-muted text-xs">
            Se acabaron las lecturas de IA de este mes en tu plan (se comparten con los recibos).
          </Text>
        ) : quota?.remaining != null ? (
          <Text className="text-text-muted text-xs">
            Te quedan {quota.remaining} de {quota.limit} lecturas este mes (se comparten con los
            recibos).
          </Text>
        ) : null}
        {error ? <Text className="text-expense text-sm">{error}</Text> : null}
      </ScrollView>
    );
  }

  // ---- Paso 2: revisar y confirmar --------------------------------------
  const w = candidate.wallet;
  const txns = candidate.transactions;
  const selected = txns.filter((_, i) => !excluded.has(i));
  const needsExpenseCat = selected.some((t) => t.type === 'expense' && !t.category);
  const needsIncomeCat = selected.some((t) => t.type === 'income' && !t.category);
  const missingCategory =
    (needsExpenseCat && !defaultExpenseCat) || (needsIncomeCat && !defaultIncomeCat);
  const opening = openingBalanceFor(w, selected);
  const currencyMismatch =
    target === 'existing' && existingWallet && existingWallet.currency !== w.currency;
  const busy = importer.isPending;
  const canSubmit =
    !busy && !missingCategory && (target === 'existing' ? !!walletId : name.trim().length > 0);

  const low = (key: string) => candidate.confidence[key] === 'low';

  function walletPayload(): WalletInput {
    const bankKey = w.bank ? norm(w.bank) : null;
    const schema = bankKey
      ? (schemasQ.data ?? []).find((s) => norm(s.bank_name) === bankKey)
      : undefined;
    const isCredit = w.kind === 'credit';
    return {
      name: name.trim(),
      currency: w.currency,
      purpose: w.purpose,
      kind: w.kind,
      opening_balance: opening.toFixed(2),
      counts_toward_net_worth: true,
      credit_limit: isCredit && w.credit_limit ? toNumber(w.credit_limit).toFixed(2) : null,
      card_last4: w.card_last4,
      billing_cycle_day: isCredit ? w.billing_cycle_day : null,
      payment_due_day: isCredit ? w.payment_due_day : null,
      interest_rate: isCredit && w.interest_rate ? w.interest_rate : null,
      bank_schema: schema?.id ?? null,
    };
  }

  async function onConfirm() {
    setError(null);
    setFailedCount(0);
    const inputs: TransactionInput[] = selected.map((t) => ({
      type: t.type,
      wallet: walletId ?? '',
      category: t.category ?? (t.type === 'expense' ? defaultExpenseCat : defaultIncomeCat),
      amount: toNumber(t.amount).toFixed(2),
      date: t.date,
      description: t.description,
    }));
    try {
      const result = await importer.mutateAsync({
        wallet: target === 'existing' ? walletId! : walletPayload(),
        transactions: inputs,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      if (result.failed.length > 0) {
        haptics.error();
        setFailedCount(result.failed.length);
        setError(
          `Se importaron ${result.created} movimientos y ${result.failed.length} fallaron. ` +
            'Revisa la cartera antes de volver a intentarlo para no duplicar.',
        );
        return;
      }
      haptics.success();
      showSnackbar({
        message:
          target === 'new'
            ? `Cartera creada con ${result.created} movimientos`
            : `${result.created} movimientos importados`,
      });
      dismissModal();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo crear la cartera.'));
    } finally {
      setProgress(null);
    }
  }

  function toggle(i: number) {
    haptics.selection();
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <ScrollView contentContainerClassName="gap-4 py-3 pb-10" keyboardShouldPersistTaps="handled">
      <Card title="Lo que se leyó">
        <View className="gap-1.5">
          <ReadRow label="Banco" value={w.bank} review={low('bank')} />
          <ReadRow label="Tarjeta / cuenta" value={w.card_last4 ? `···· ${w.card_last4}` : null} review={low('last4')} />
          <ReadRow
            label="Período"
            value={
              candidate.period_start || candidate.period_end
                ? `${candidate.period_start ?? '?'} → ${candidate.period_end ?? '?'}`
                : null
            }
            review={low('period_end')}
          />
          <ReadRow
            label={w.purpose === 'debt' ? 'Saldo al corte (debes)' : 'Saldo al corte'}
            value={w.closing_balance != null ? formatMoney(w.closing_balance, w.currency) : null}
            review={low('closing_balance')}
          />
          {w.kind === 'credit' ? (
            <>
              <ReadRow label="Fecha límite de pago" value={candidate.payment_due_date} review={false} />
              <ReadRow
                label="Pago mínimo"
                value={w.minimum_payment ? formatMoney(w.minimum_payment, w.currency) : null}
                review={false}
              />
              <ReadRow
                label="Límite de crédito"
                value={w.credit_limit ? formatMoney(w.credit_limit, w.currency) : null}
                review={false}
              />
              <ReadRow
                label="Tasa anual"
                value={w.interest_rate ? `${w.interest_rate}%` : null}
                review={false}
              />
            </>
          ) : null}
        </View>
        <Text className="text-text-muted mt-2 text-xs">
          Lo marcado «revisar» no se leyó bien: confírmalo contra tu estado de cuenta.
        </Text>
      </Card>

      {target === 'new' ? (
        <TextField label="Nombre de la cartera" value={name} onChangeText={setName} />
      ) : (
        <Text className="text-text-muted text-sm">
          Se importarán a <Text style={{ fontFamily: fonts.semibold }}>{existingWallet?.name}</Text>.
        </Text>
      )}
      {currencyMismatch ? (
        <Text className="text-warning text-xs">
          Ojo: el estado de cuenta parece estar en {w.currency} y la cartera en{' '}
          {existingWallet?.currency}.
        </Text>
      ) : null}

      <Card
        title={`Movimientos (${selected.length} de ${txns.length})`}
        action={
          txns.length > 0 ? (
            <Pressable
              onPress={() => {
                haptics.tap();
                setExcluded(excluded.size === 0 ? new Set(txns.map((_, i) => i)) : new Set());
              }}
              accessibilityRole="button"
            >
              <Text className="text-primary text-sm" style={{ fontFamily: fonts.semibold }}>
                {excluded.size === 0 ? 'Ninguno' : 'Todos'}
              </Text>
            </Pressable>
          ) : undefined
        }
      >
        {txns.length === 0 ? (
          <Text className="text-text-muted text-sm">
            No se pudieron leer movimientos. Puedes crear la cartera igual.
          </Text>
        ) : (
          <View>
            {txns.map((t, i) => {
              const on = !excluded.has(i);
              const dup = t.possible_duplicates.length > 0;
              return (
                <Pressable
                  key={`${t.date}-${i}`}
                  onPress={() => toggle(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${t.description}, ${t.amount}`}
                  className="flex-row items-center gap-3 border-b border-border/50 py-2.5 active:opacity-70"
                >
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-md border ${
                      on ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {on ? <Icon name="check" size={12} color={colors.primaryFg} /> : null}
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-text text-sm" numberOfLines={1}>
                      {t.description}
                    </Text>
                    <Text className="text-text-muted text-xs">
                      {t.date}
                      {dup ? ' · ya parece registrado' : ''}
                      {!t.category ? ' · sin categoría' : ''}
                    </Text>
                  </View>
                  <Text
                    className={t.type === 'income' ? 'text-income text-sm' : 'text-text text-sm'}
                    style={{ fontFamily: fonts.semibold }}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatMoney(t.amount, w.currency)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      {needsExpenseCat ? (
        <Select
          label="Categoría para los gastos sin categoría"
          value={defaultExpenseCat}
          onChange={setDefaultExpenseCat}
          options={categoryOptions('expense')}
          placeholder="Elige una categoría"
        />
      ) : null}
      {needsIncomeCat ? (
        <Select
          label="Categoría para los ingresos/pagos sin categoría"
          value={defaultIncomeCat}
          onChange={setDefaultIncomeCat}
          options={categoryOptions('income')}
          placeholder="Elige una categoría"
        />
      ) : null}

      {target === 'new' && w.closing_balance != null ? (
        <Text className="text-text-muted text-xs">
          Saldo inicial de la cartera: {formatMoney(opening, w.currency)}. Se calcula para que, con
          los movimientos elegidos, el saldo quede igual al del estado de cuenta (
          {formatMoney(w.purpose === 'debt' ? -toNumber(w.closing_balance) : toNumber(w.closing_balance), w.currency)}
          ).
        </Text>
      ) : null}

      {error ? <Text className="text-expense text-sm">{error}</Text> : null}
      {progress ? (
        <Text className="text-text-muted text-sm">
          Importando {progress.done} de {progress.total}…
        </Text>
      ) : null}

      <Button
        label={
          target === 'new'
            ? `Crear cartera${selected.length ? ` e importar ${selected.length}` : ''}`
            : `Importar ${selected.length} movimientos`
        }
        onPress={onConfirm}
        disabled={!canSubmit || failedCount > 0}
        loading={busy}
      />
      <Button label="Empezar de nuevo" variant="ghost" onPress={reset} disabled={busy} />
    </ScrollView>
  );
}

function ReadRow({
  label,
  value,
  review,
}: {
  label: string;
  value: string | null;
  review: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-text-muted text-sm">{label}</Text>
      <View className="flex-row items-center gap-2">
        {review ? <Text className="text-warning text-[11px]">revisar</Text> : null}
        <Text className={value ? 'text-text text-sm' : 'text-text-muted text-sm'}>
          {value ?? '—'}
        </Text>
      </View>
    </View>
  );
}
