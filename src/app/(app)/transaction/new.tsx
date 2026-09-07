import { useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/components/TransactionForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function NewTransactionScreen() {
  const { duplicateFrom } = useLocalSearchParams<{ duplicateFrom?: string }>();

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Agregar transacción" />
      <TransactionForm duplicateFromId={duplicateFrom} />
    </Screen>
  );
}
