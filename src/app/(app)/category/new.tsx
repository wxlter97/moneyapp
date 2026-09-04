import { useLocalSearchParams } from 'expo-router';

import { CategoryForm } from '@/components/CategoryForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import type { CategoryType } from '@/api/types';

export default function NewCategoryScreen() {
  const { type, parent } = useLocalSearchParams<{ type?: string; parent?: string }>();
  const initialType: CategoryType = type === 'income' ? 'income' : 'expense';

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={parent ? 'Nueva subcategoría' : 'Nueva categoría'} />
      <CategoryForm initialType={initialType} initialParent={parent} />
    </Screen>
  );
}
