import { useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/components/TransactionForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Editar transacción" />
      <TransactionForm transactionId={id} />
    </Screen>
  );
}
