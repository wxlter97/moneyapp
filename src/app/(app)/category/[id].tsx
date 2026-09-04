import { useLocalSearchParams } from 'expo-router';

import { CategoryForm } from '@/components/CategoryForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Editar categoría" />
      <CategoryForm categoryId={id} />
    </Screen>
  );
}
