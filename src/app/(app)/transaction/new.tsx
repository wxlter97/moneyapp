import { useLocalSearchParams } from 'expo-router';

import { TransactionForm, type TransactionPrefill } from '@/components/TransactionForm';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Screen } from '@/components/ui/Screen';
import type { TransactionType } from '@/api/types';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{
    duplicateFrom?: string;
    prefillType?: TransactionType;
    prefillWallet?: string;
    prefillToWallet?: string;
    prefillCategory?: string;
    prefillAmount?: string;
    prefillDate?: string;
    prefillNote?: string;
  }>();

  // Viene de tocar un ítem "Programado" en el resumen (ver ScheduledCard en
  // dashboard.tsx): trae los datos del gasto/transferencia recurrente o de
  // la cuota, listos para solo confirmar y guardar.
  const prefill: TransactionPrefill | undefined =
    params.prefillType && params.prefillWallet && params.prefillAmount && params.prefillDate
      ? {
          type: params.prefillType,
          walletId: params.prefillWallet,
          toWalletId: params.prefillToWallet || null,
          categoryId: params.prefillCategory || null,
          amount: params.prefillAmount,
          date: params.prefillDate,
          note: params.prefillNote,
        }
      : undefined;

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title="Agregar transacción" />
      <TransactionForm duplicateFromId={params.duplicateFrom} prefill={prefill} />
    </Screen>
  );
}
