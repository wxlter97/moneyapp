import { WalletForm } from '@/components/WalletForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function NewWalletScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Nueva cartera" />
      <WalletForm />
    </Screen>
  );
}
