import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  useDeleteExchangeRate,
  useExchangeRates,
  useSetBaseCurrency,
  useSetExchangeRate,
  useWallets,
} from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { ExchangeRate } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { CURRENCIES, currencyLabel } from '@/lib/currency';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { fonts } from '@/theme/typography';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * Herramientas → Monedas: la moneda en la que se expresan los totales
 * agregados (patrimonio, presupuesto, flujo) y las tasas manuales para
 * convertir las carteras que están en otra. Sin tasa configurada, esa
 * cartera simplemente no entra en esos totales (los backend lo excluye,
 * no lo trata como 1:1) — por eso el banner de "sin tasa" es una alerta,
 * no un detalle cosmético.
 */
export default function CurrenciesScreen() {
  const activeWorkspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === s.activeId),
  );
  const isOwner = activeWorkspace?.role === 'owner';

  const walletsQ = useWallets();
  const ratesQ = useExchangeRates();
  const setBaseCurrency = useSetBaseCurrency();

  const [baseCurrencyError, setBaseCurrencyError] = useState<string | null>(null);

  const baseCurrency = activeWorkspace?.base_currency ?? 'USD';

  const foreignCurrencies = useMemo(() => {
    const set = new Set((walletsQ.data ?? []).map((w) => w.currency));
    set.delete(baseCurrency);
    return [...set].sort();
  }, [walletsQ.data, baseCurrency]);

  const ratesByCurrency = useMemo(() => {
    const map = new Map<string, ExchangeRate>();
    for (const r of ratesQ.data ?? []) map.set(r.currency, r);
    return map;
  }, [ratesQ.data]);

  // Tasas cargadas para monedas que ninguna cartera usa ya (se pueden borrar).
  const unusedRates = (ratesQ.data ?? []).filter((r) => !foreignCurrencies.includes(r.currency));

  async function onChangeBaseCurrency(next: string) {
    if (!activeWorkspace || next === baseCurrency) return;
    setBaseCurrencyError(null);
    try {
      await setBaseCurrency.mutateAsync({ id: activeWorkspace.id, currency: next });
      haptics.success();
    } catch (err) {
      haptics.error();
      setBaseCurrencyError(errorMessage(err, 'No se pudo cambiar la moneda base.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Monedas" />

      <ScrollView contentContainerClassName="gap-4 py-2" keyboardShouldPersistTaps="handled">
        <Card title="Moneda base">
          <Text className="text-text-muted mb-3 text-sm leading-5">
            El patrimonio neto, el presupuesto y el flujo de caja se muestran en
            esta moneda cuando hay carteras en más de una.
          </Text>
          {isOwner ? (
            <Select
              label="Moneda"
              value={baseCurrency}
              onChange={onChangeBaseCurrency}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
            />
          ) : (
            <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
              {baseCurrency} — {currencyLabel(baseCurrency)}
            </Text>
          )}
          {baseCurrencyError ? (
            <Text className="text-expense mt-2 text-xs">{baseCurrencyError}</Text>
          ) : null}
          {!isOwner ? (
            <Text className="text-text-muted mt-2 text-xs">
              Sólo el dueño del presupuesto puede cambiarla.
            </Text>
          ) : null}
        </Card>

        {walletsQ.isLoading || ratesQ.isLoading ? (
          <LoadingState />
        ) : walletsQ.isError ? (
          <ErrorState error={walletsQ.error} onRetry={walletsQ.refetch} />
        ) : foreignCurrencies.length === 0 ? (
          <Text className="text-text-muted px-1 text-xs">
            Todas tus carteras ya están en {baseCurrency} — no hace falta ninguna tasa.
          </Text>
        ) : (
          <Card title="Tasas de cambio">
            <Text className="text-text-muted mb-3 text-sm leading-5">
              Cuánto vale 1 unidad de cada moneda en {baseCurrency}. Se cargan a mano
              (no hay conversión automática); sin tasa, esa cartera no entra en los
              totales de arriba.
            </Text>
            <View className="gap-4">
              {foreignCurrencies.map((currency, i) => (
                <View key={currency}>
                  {i > 0 ? <View className="mb-4 h-px bg-border/30" /> : null}
                  <RateRow
                    currency={currency}
                    baseCurrency={baseCurrency}
                    existing={ratesByCurrency.get(currency)}
                  />
                </View>
              ))}
            </View>
          </Card>
        )}

        {unusedRates.length > 0 ? (
          <Card title="Tasas sin usar">
            <Text className="text-text-muted mb-3 text-sm">
              Ninguna cartera está en estas monedas ya — las podés quitar.
            </Text>
            {unusedRates.map((r, i) => (
              <View key={r.id}>
                {i > 0 ? <View className="mb-3 h-px bg-border/30" /> : null}
                <UnusedRateRow rate={r} />
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function RateRow({
  currency,
  baseCurrency,
  existing,
}: {
  currency: string;
  baseCurrency: string;
  existing?: ExchangeRate;
}) {
  const setRate = useSetExchangeRate();
  const [value, setValue] = useState(existing?.rate_to_base ?? '');
  const [error, setError] = useState<string | null>(null);

  const dirty = value.trim() !== (existing?.rate_to_base ?? '');

  async function onSave() {
    setError(null);
    const n = toNumber(value);
    if (n <= 0) {
      setError('Tiene que ser mayor que 0.');
      return;
    }
    try {
      await setRate.mutateAsync({ currency, rate: n.toString() });
      haptics.success();
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'No se pudo guardar.'));
    }
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-sm" style={{ fontFamily: fonts.semibold }}>
          {currency} — {currencyLabel(currency)}
        </Text>
        {!existing ? (
          <View className="rounded-full bg-surface-2 px-2 py-0.5">
            <Text className="text-expense text-[10px] uppercase tracking-wide">Sin tasa</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <TextField
            label={`1 ${currency} = ? ${baseCurrency}`}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder="0.00"
            error={error ?? undefined}
          />
        </View>
        <View className="pb-0.5">
          <Button
            label="Guardar"
            loading={setRate.isPending}
            disabled={!value.trim() || !dirty}
            onPress={onSave}
          />
        </View>
      </View>
    </View>
  );
}

function UnusedRateRow({ rate }: { rate: ExchangeRate }) {
  const remove = useDeleteExchangeRate();

  async function onRemove() {
    try {
      await remove.mutateAsync(rate.id);
      haptics.selection();
    } catch {
      haptics.error();
    }
  }

  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-text-muted text-sm">
        {rate.currency} — 1 = {rate.rate_to_base}
      </Text>
      <Button label="Quitar" variant="ghost" loading={remove.isPending} onPress={onRemove} />
    </View>
  );
}
