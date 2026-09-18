import { fireEvent, render, screen } from '@testing-library/react-native';

import SplitPeopleScreen from '@/app/(app)/split-people';
import type { Person, Transaction } from '@/api/types';

// `ModalHeader`/`Screen` importan `expo-router` para el gesto de "volver" --
// mismo motivo que en otros tests de pantalla de este archivo.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({ id: 'txn1' }),
}));

const mockTransactionQuery = jest.fn();
const mockPeopleQuery = jest.fn();
const mockSplit = jest.fn();
const mockCreatePerson = jest.fn();

jest.mock('@/api/queries', () => ({
  useTransaction: () => mockTransactionQuery(),
  usePeople: () => mockPeopleQuery(),
  useSplitTransactionPeople: () => ({ mutateAsync: mockSplit, isPending: false }),
  useCreatePerson: () => ({ mutateAsync: mockCreatePerson }),
}));

const ME_PERSON: Person = { id: 'me', name: 'Alice', member: 'mem1', is_me: true, created_at: '' };
const BETO: Person = { id: 'p-beto', name: 'Beto', member: null, is_me: false, created_at: '' };

const TXN_WITH_SPLIT = {
  id: 'txn1',
  description: 'Cena',
  amount: '30.00',
  currency: 'USD',
  paid_by: 'me',
  shares: [
    { id: 's1', person: 'p-beto', person_name: 'Beto', amount: '10.00', is_settled: false, settled_at: null },
  ],
} as unknown as Transaction;

const TXN_WITHOUT_SPLIT = {
  ...TXN_WITH_SPLIT,
  paid_by: null,
  shares: [],
} as unknown as Transaction;

describe('SplitPeopleScreen', () => {
  beforeEach(() => {
    mockPeopleQuery.mockReturnValue({ data: [ME_PERSON, BETO], isLoading: false });
    mockSplit.mockReset().mockResolvedValue({});
  });

  // HALLAZGO (reportado por el usuario): "la división entre personas no
  // persiste en esa pantalla" -- en realidad sí persistía del lado del
  // backend, pero esta pantalla nunca leía `txn.shares`/`txn.paid_by` de
  // vuelta, así que "Editar división" arrancaba siempre en blanco (un
  // participante vacío, "Yo" como pagador) y guardar de nuevo pisaba la
  // división real con eso.
  it('al editar una división existente, precarga el monto y la persona ya asignados', async () => {
    mockTransactionQuery.mockReturnValue({ data: TXN_WITH_SPLIT, isLoading: false });
    await render(<SplitPeopleScreen />);

    expect(screen.getByLabelText('Su parte').props.value).toBe('10.00');
    // Aparece dos veces: como opción de "¿Quién pagó?" y como la persona ya
    // asignada en la fila del participante -- la selección real ya la prueba
    // el siguiente test (el payload que efectivamente se reenvía).
    expect(screen.getAllByText('Beto').length).toBe(2);
  });

  it('al confirmar sin cambiar nada, reenvía la misma división que ya tenía (no la resetea)', async () => {
    mockTransactionQuery.mockReturnValue({ data: TXN_WITH_SPLIT, isLoading: false });
    await render(<SplitPeopleScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Dividir entre personas' }));

    expect(mockSplit).toHaveBeenCalledWith({
      id: 'txn1',
      input: {
        // El pagador es la persona `is_me` -- se resuelve como "yo" (undefined,
        // el backend lo completa solo), no como el id crudo de esa persona.
        paid_by: undefined,
        participants: [{ person: 'p-beto', amount: '10.00' }],
      },
    });
  });

  it('sin división previa, arranca en blanco (un participante vacío) como siempre', async () => {
    mockTransactionQuery.mockReturnValue({ data: TXN_WITHOUT_SPLIT, isLoading: false });
    await render(<SplitPeopleScreen />);

    expect(screen.getByLabelText('Su parte').props.value).toBe('0.00');
    expect(screen.getByRole('button', { name: 'Dividir entre personas' }).props.accessibilityState?.disabled).toBe(
      true,
    );
  });

  it('explica en la pantalla que esto no cambia el monto/categoría de la transacción', async () => {
    mockTransactionQuery.mockReturnValue({ data: TXN_WITHOUT_SPLIT, isLoading: false });
    await render(<SplitPeopleScreen />);

    expect(screen.getByText(/no cambia el monto ni la categoría/i)).toBeTruthy();
  });
});
