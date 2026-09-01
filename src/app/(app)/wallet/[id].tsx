import { useLocalSearchParams } from 'expo-router';

import { WalletForm } from '@/components/WalletForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function EditWalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Editar cartera" />
      <WalletForm walletId={id} />
    </Screen>
  );
}
