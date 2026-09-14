import { InstallmentForm } from '@/components/InstallmentForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';

export default function NewInstallmentScreen() {
  return (
    <Screen edges={['top', 'bottom']} variant="drawer">
      <ModalHeader title="Nueva compra a plazo" />
      <InstallmentForm />
    </Screen>
  );
}
