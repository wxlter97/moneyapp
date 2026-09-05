import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTags } from '@/api/queries';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme';

const MAX_TAGS = 8;

interface TagPickerProps {
  /** Nombres de etiqueta elegidos para esta transacción. */
  value: string[];
  onChange: (names: string[]) => void;
}

/**
 * Chips de etiquetas para una transacción: toca una existente para
 * agregarla/quitarla, o escribe un nombre nuevo -- se crea al guardar la
 * transacción (get-or-create en el backend, ver `TransactionInput.tag_names`).
 */
export function TagPicker({ value, onChange }: TagPickerProps) {
  const colors = useColors();
  const tagsQ = useTags();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  // Existentes + las ya elegidas que todavía no existen (recién tipeadas) --
  // así una etiqueta nueva no desaparece de la vista hasta que se guarde.
  const allNames = useMemo(() => {
    const set = new Set((tagsQ.data ?? []).map((t) => t.name));
    value.forEach((n) => set.add(n));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [tagsQ.data, value]);

  function toggle(name: string) {
    haptics.selection();
    if (value.includes(name)) onChange(value.filter((n) => n !== name));
    else if (value.length < MAX_TAGS) onChange([...value, name]);
  }

  function commitDraft() {
    const name = draft.trim();
    setDraft('');
    setAdding(false);
    if (!name || value.length >= MAX_TAGS) return;
    if (value.some((n) => n.toLowerCase() === name.toLowerCase())) return;
    haptics.tap();
    onChange([...value, name]);
  }

  return (
    <View className="gap-1.5">
      <Text className="text-text-muted text-sm">Etiquetas (opcional)</Text>
      <View className="flex-row flex-wrap gap-2">
        {allNames.map((name) => {
          const selected = value.includes(name);
          return (
            <Pressable
              key={name}
              onPress={() => toggle(name)}
              accessibilityRole="button"
              accessibilityLabel={`Etiqueta: ${name}`}
              accessibilityState={{ selected }}
              className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                selected ? 'border-primary bg-primary' : 'border-border bg-surface-2'
              }`}
            >
              <Text
                className={selected ? 'text-primary-fg text-xs font-semibold' : 'text-text-muted text-xs'}
                numberOfLines={1}
              >
                {name}
              </Text>
            </Pressable>
          );
        })}

        {adding ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commitDraft}
            onBlur={commitDraft}
            placeholder="Nueva etiqueta"
            placeholderTextColor={colors.textMuted}
            maxLength={40}
            className="h-8 min-w-[110px] rounded-full border border-primary bg-surface px-3 text-text text-xs"
          />
        ) : value.length < MAX_TAGS ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              setAdding(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Nueva etiqueta"
            className="flex-row items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 active:opacity-70"
          >
            <Icon name="plus" size={12} color={colors.textMuted} />
            <Text className="text-text-muted text-xs">Nueva</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
