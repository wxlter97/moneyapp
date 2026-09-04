import { useLocalSearchParams } from 'expo-router';

import { RecurringForm } from '@/components/RecurringForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function EditRecurringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Editar recurrente" />
      <RecurringForm recurringId={id} />
    </Screen>
  );
}
