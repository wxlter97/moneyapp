import { TransactionForm } from '@/components/TransactionForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function NewTransactionScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Agregar transacción" />
      <TransactionForm />
    </Screen>
  );
}
