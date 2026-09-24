import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useCreateWallet } from '@/api/queries';
import { errorMessage } from '@/api/errors';
import type { WalletInput, WalletKind, WalletPurpose } from '@/api/types';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { haptics } from '@/lib/haptics';
import { toNumber } from '@/lib/money';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

type PresetKey = 'cash' | 'bank' | 'credit' | 'savings';

interface Preset {
  label: string;
  defaultName: string;
  icon: IconName;
  purpose: WalletPurpose;
  kind: WalletKind;
  amountLabel: string;
}

// Los mismos `purpose`+`kind` que `WALLET_PRESETS` en `WalletForm`: una
// tarjeta es una deuda de tipo crédito, el ahorro es una cuenta de banco con
// propósito de ahorro.
const PRESETS: Record<PresetKey, Preset> = {
  cash: { label: 'Efectivo', defaultName: 'Efectivo', icon: 'cash', purpose: 'spending', kind: 'cash', amountLabel: 'Cuánto tenés' },
  bank: { label: 'Cuenta', defaultName: 'Cuenta bancaria', icon: 'bank', purpose: 'spending', kind: 'bank', amountLabel: 'Saldo de hoy' },
  credit: { label: 'Tarjeta', defaultName: 'Tarjeta de crédito', icon: 'card', purpose: 'debt', kind: 'credit', amountLabel: 'Lo que debés hoy' },
  savings: { label: 'Ahorro', defaultName: 'Ahorro', icon: 'star', purpose: 'savings', kind: 'bank', amountLabel: 'Cuánto tenés ahorrado' },
};

interface Row {
  key: number;
  preset: PresetKey;
  name: string;
  amount: string;
}

let nextKey = 0;
const makeRow = (preset: PresetKey): Row => ({
  key: nextKey++,
  preset,
  name: PRESETS[preset].defaultName,
  amount: '',
});

/**
 * Onboarding: todas las cuentas con su saldo de hoy, en un solo paso, en vez
 * de abrir el formulario completo de cartera una vez por cuenta. Lo avanzado
 * (día de corte, límite, meta, moneda) queda para después, editando cada
 * una. Arranca con Efectivo y una cuenta, que es lo que casi todos tienen.
 */
export function QuickWalletSetup({
  currency,
  hasWallets,
  onDone,
}: {
  currency: string;
  /** Ya hay carteras: las nuevas no se marcan por defecto. */
  hasWallets: boolean;
  onDone: (created: number) => void;
}) {
  const colors = useColors();
  const create = useCreateWallet();
  const [rows, setRows] = useState<Row[]>(() => [makeRow('cash'), makeRow('bank')]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function save() {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) return;
    setSaving(true);
    setError(null);
    let created = 0;
    // Uno por uno y no en paralelo: si falla uno a la mitad, los que ya se
    // crearon se sacan de la lista y reintentar no los duplica.
    for (const row of valid) {
      const preset = PRESETS[row.preset];
      const amount = toNumber(row.amount);
      const input: WalletInput = {
        name: row.name.trim(),
        purpose: preset.purpose,
        kind: preset.kind,
        currency,
        opening_balance: (preset.purpose === 'debt' ? -amount : amount).toFixed(2),
        // La primera cuenta de gasto queda por defecto para cargar movimientos.
        is_default: !hasWallets && created === 0 && preset.purpose === 'spending',
      };
      try {
        await create.mutateAsync(input);
        created += 1;
        setRows((rs) => rs.filter((r) => r.key !== row.key));
      } catch (err) {
        setError(`${row.name.trim()}: ${errorMessage(err, 'no se pudo crear.')}`);
        haptics.error();
        setSaving(false);
        return;
      }
    }
    haptics.success();
    setSaving(false);
    onDone(created);
  }

  return (
    <View className="w-full gap-3">
      {rows.map((row) => {
        const preset = PRESETS[row.preset];
        return (
          <View key={row.key} className="gap-2 rounded-2xl bg-surface-2 p-3">
            <View className="flex-row items-center gap-2">
              <Icon name={preset.icon} size={16} color={colors.textMuted} />
              <View className="flex-1">
                <TextField
                  label={preset.label}
                  value={row.name}
                  onChangeText={(t) => update(row.key, { name: t })}
                  maxLength={100}
                />
              </View>
              <Pressable
                onPress={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${row.name || preset.label}`}
                className="mt-6 h-9 w-9 items-center justify-center rounded-full active:opacity-60"
              >
                <Icon name="close" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
            <AmountInput
              label={preset.amountLabel}
              value={row.amount}
              onChangeText={(t) => update(row.key, { amount: t })}
              currency={currency}
            />
          </View>
        );
      })}

      <View className="flex-row flex-wrap gap-2">
        {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => {
              haptics.tap();
              setRows((rs) => [...rs, makeRow(key)]);
            }}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full border border-border px-3 py-1.5 active:opacity-70"
          >
            <Icon name="plus" size={12} color={colors.primary} />
            <Text className="text-text text-xs" style={{ fontFamily: fonts.semibold }}>
              {PRESETS[key].label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text className="text-expense text-xs">{error}</Text> : null}

      {rows.length > 0 ? (
        <Button
          label={rows.length === 1 ? 'Guardar cartera' : `Guardar ${rows.length} carteras`}
          loading={saving}
          disabled={!rows.some((r) => r.name.trim())}
          onPress={save}
        />
      ) : null}
    </View>
  );
}
