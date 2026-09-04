import { RecurringForm } from '@/components/RecurringForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function NewRecurringScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Nuevo recurrente" />
      <RecurringForm />
    </Screen>
  );
}
