import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useLoyaltyCategoryTypes,
  useUpdateCategory,
} from '@/api/queries';
import { errorMessage, fieldErrors } from '@/api/errors';
import type { CategoryInput, CategoryType } from '@/api/types';
import { dismissModal } from '@/components/ui/ModalHeader';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { LoadingState } from '@/components/ui/states';
import { haptics } from '@/lib/haptics';
import { muteColor } from '@/theme/accents';
import { fonts } from '@/theme/typography';

interface CategoryFormProps {
  categoryId?: string;
  /** Tipo inicial al crear (p. ej. desde el form de gasto). */
  initialType?: CategoryType;
  /** Grupo (categoría padre) preseleccionado al crear una subcategoría. */
  initialParent?: string;
}

const TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
];

const SWATCHES = [
  '#F97316', '#22C55E', '#3B82F6', '#8B5CF6', '#EAB308', '#EF4444',
  '#EC4899', '#14B8A6', '#6366F1', '#A855F7', '#06B6D4', '#84CC16',
  '#F43F5E', '#64748B', '#94A3B8',
];

export function CategoryForm({
  categoryId,
  initialType = 'expense',
  initialParent,
}: CategoryFormProps) {
  const editing = !!categoryId;
  const categoriesQ = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  const existing = useMemo(
    () => categoriesQ.data?.find((c) => c.id === categoryId),
    [categoriesQ.data, categoryId],
  );

  const initialParentCat = useMemo(
    () => categoriesQ.data?.find((c) => c.id === initialParent),
    [categoriesQ.data, initialParent],
  );

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>(
    initialParentCat?.type ?? initialType,
  );
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(initialParent ?? null);
  const [categoryTypeId, setCategoryTypeId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Al crear una subcategoría, hereda el tipo del grupo cuando cargan los datos.
  useEffect(() => {
    if (editing || !initialParentCat) return;
    setType(initialParentCat.type);
    setParentId(initialParentCat.id);
  }, [editing, initialParentCat]);

  useEffect(() => {
    if (!editing || prefilled || !existing) return;
    setName(existing.name);
    setType(existing.type);
    setIcon(existing.icon ?? '');
    setColor(existing.color || null);
    setParentId(existing.parent);
    setCategoryTypeId(existing.category_type);
    setPrefilled(true);
  }, [editing, prefilled, existing]);

  // Rubro estándar del catálogo de lealtad (opcional): mapea esta categoría a
  // uno para heredar las tasas de puntos/cashback/descuento que le
  // correspondan en las tarjetas con producto asignado (ver `WalletForm`).
  const categoryTypesQ = useLoyaltyCategoryTypes();
  const categoryTypeOptions = useMemo(
    () =>
      (categoryTypesQ.data ?? []).map((t) => ({
        value: t.id,
        label: t.icon ? `${t.icon} ${t.name}` : t.name,
      })),
    [categoryTypesQ.data],
  );

  const parentOptions = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => c.type === type && c.id !== categoryId && c.parent === null)
        .map((c) => ({ value: c.id, label: `${c.icon ? `${c.icon} ` : ''}${c.name}` })),
    [categoriesQ.data, type, categoryId],
  );

  const busy = create.isPending || update.isPending || remove.isPending;
  const canSubmit = name.trim().length > 0 && !busy;

  async function onSubmit() {
    setFormError(null);
    setFields({});
    const payload: CategoryInput = {
      name: name.trim(),
      type,
      icon: icon.trim(),
      color: color ?? '',
      parent: parentId || null,
      category_type: categoryTypeId || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: categoryId!, input: payload });
      else await create.mutateAsync(payload);
      dismissModal();
    } catch (err) {
      setFields(fieldErrors(err));
      setFormError(errorMessage(err, 'No se pudo guardar la categoría.'));
    }
  }

  async function onDelete() {
    if (!categoryId) return;
    try {
      await remove.mutateAsync(categoryId);
      dismissModal();
    } catch (err) {
      setConfirmingDelete(false);
      setFormError(
        errorMessage(err, 'No se pudo eliminar (¿tiene transacciones o subcategorías?).'),
      );
    }
  }

  if (editing && categoriesQ.isLoading) return <LoadingState />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="gap-4 py-3" keyboardShouldPersistTaps="handled">
        {!editing ? (
          <View className="gap-1.5">
            <Text className="text-text-muted text-sm">Tipo</Text>
            <Segmented
              value={type}
              onChange={(v) => {
                setType(v);
                setParentId(null);
              }}
              options={TYPE_OPTIONS}
            />
          </View>
        ) : null}

        <TextField
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Comida, Sueldo, Transporte…"
          error={fields.name}
        />

        <TextField
          label="Icono (emoji, opcional)"
          value={icon}
          onChangeText={(t) => setIcon(t.slice(0, 4))}
          placeholder="🍽"
          error={fields.icon}
        />

        <View className="gap-1.5">
          <Text className="text-text-muted text-sm">Color (opcional)</Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => {
                haptics.selection();
                setColor(null);
              }}
              className={`h-8 w-8 items-center justify-center rounded-full border ${
                color === null ? 'border-primary' : 'border-border'
              }`}
              accessibilityRole="button"
            >
              <Text className="text-text-muted text-xs">—</Text>
            </Pressable>
            {SWATCHES.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  haptics.selection();
                  setColor(c);
                }}
                style={{ backgroundColor: muteColor(c) ?? c }}
                className={`h-8 w-8 rounded-full border-2 ${
                  color === c ? 'border-text' : 'border-transparent'
                }`}
                accessibilityRole="button"
              />
            ))}
          </View>
        </View>

        {parentOptions.length > 0 ? (
          <Select
            label="Categoría padre (opcional)"
            value={parentId}
            onChange={setParentId}
            options={[{ value: '', label: 'Ninguna' }, ...parentOptions]}
            placeholder="Ninguna"
          />
        ) : null}

        {categoryTypeOptions.length > 0 ? (
          <Select
            label="Rubro para tarjetas con recompensas (opcional)"
            value={categoryTypeId}
            onChange={setCategoryTypeId}
            options={[{ value: '', label: 'Sin especificar' }, ...categoryTypeOptions]}
            placeholder="Sin especificar"
          />
        ) : null}

        {formError ? <Text className="text-expense text-sm">{formError}</Text> : null}

        <Button
          label={editing ? 'Guardar cambios' : 'Crear categoría'}
          loading={create.isPending || update.isPending}
          disabled={!canSubmit}
          onPress={onSubmit}
        />

        {editing && !confirmingDelete ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              setConfirmingDelete(true);
            }}
            disabled={busy}
            className="items-center py-2 active:opacity-60"
            accessibilityRole="button"
          >
            <Text className="text-expense text-sm" style={{ fontFamily: fonts.semibold }}>
              Eliminar categoría
            </Text>
          </Pressable>
        ) : null}

        {editing && confirmingDelete ? (
          <View className="gap-2 rounded-2xl bg-expense/10 p-3">
            <Text className="text-text text-sm">¿Eliminar esta categoría?</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => setConfirmingDelete(false)}
                />
              </View>
              <View className="flex-1">
                <Button label="Eliminar" loading={remove.isPending} onPress={onDelete} />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
