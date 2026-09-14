import { useLocalSearchParams } from 'expo-router';

import { InstallmentForm } from '@/components/InstallmentForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function EditInstallmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen edges={['top', 'bottom']} variant="drawer">
      <ModalHeader title="Editar compra a plazo" />
      <InstallmentForm installmentId={id} />
    </Screen>
  );
}
