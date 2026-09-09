import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Category, RecurringExpense, Wallet } from '@/api/types';
import { RecurringForm } from '@/components/RecurringForm';

// jest-hoist sólo permite referenciar, desde adentro de un factory de
// jest.mock(...), identificadores prefijados con "mock" -- de ahí el prefijo
// en todo lo que usan los mocks de abajo.
const mockMutateAsync = jest.fn(async (_input: unknown) => ({}));
const mockDismissModal = jest.fn();

const mockCuenta = { id: 'w1', name: 'Cuenta principal', currency: 'USD' } as Wallet;
const mockAhorro = { id: 'w2', name: 'Ahorro', currency: 'USD' } as Wallet;
const mockSuper = {
  id: 'c1', name: 'Supermercado', type: 'expense', icon: '', color: '', parent: null, is_group: true,
} as Category;
const mockSueldo = {
  id: 'c2', name: 'Sueldo', type: 'income', icon: '', color: '', parent: null, is_group: true,
} as Category;

// Mutable entre tests (reseteado en beforeEach) -- representa el recurrente
// que trae `useRecurringExpense` en modo edición.
let mockRecurringData: RecurringExpense | undefined;

jest.mock('@/lib/modal', () => ({ dismissModal: (...args: unknown[]) => mockDismissModal(...args) }));

jest.mock('@/api/queries', () => ({
  useCategories: () => ({ data: [mockSuper, mockSueldo], isLoading: false }),
  useWallets: () => ({ data: [mockCuenta, mockAhorro], isLoading: false }),
  useRecurringExpense: () => ({ data: mockRecurringData, isLoading: false }),
  useCreateRecurringExpense: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useUpdateRecurringExpense: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useDeleteRecurringExpense: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

describe('RecurringForm', () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
    mockDismissModal.mockClear();
    mockRecurringData = undefined;
  });

  it('arranca en "Gasto": muestra el selector de categoría, no el de cartera destino', async () => {
    await render(<RecurringForm />);
    expect(screen.getByText('Categoría')).toBeTruthy();
    expect(screen.queryByText('A (cartera destino)')).toBeNull();
    expect(screen.getByText('Cartera')).toBeTruthy();
  });

  it('al pasar a "Transferencia" se oculta la categoría y aparece "Desde"/"A"', async () => {
    await render(<RecurringForm />);
    await fireEvent.press(screen.getByText('Transfer.'));

    expect(screen.queryByText('Categoría')).toBeNull();
    expect(screen.getByText('Desde')).toBeTruthy();
    expect(screen.getByText('A (cartera destino)')).toBeTruthy();
  });

  it('al pasar a "Ingreso" sólo ofrece categorías de tipo ingreso', async () => {
    await render(<RecurringForm />);
    await fireEvent.press(screen.getByText('Ingreso'));

    // Abre el select de categoría: la opción de ingreso está, la de gasto no.
    await fireEvent.press(screen.getByText('Elegir categoría'));
    expect(screen.getByText('Sueldo')).toBeTruthy();
    expect(screen.queryByText('Supermercado')).toBeNull();
  });

  it('envía el payload de transferencia con category null y to_wallet completo', async () => {
    await render(<RecurringForm />);
    await fireEvent.press(screen.getByText('Transfer.'));
    // El monto arranca en 0.00 -- `canSubmit` lo exige > 0.
    await fireEvent.changeText(screen.getByLabelText('Monto'), '5000');

    // "Desde" y "A" arrancan las dos sin elegir -- ambas muestran el mismo
    // placeholder ("Elegir cartera") hasta que se completa la primera.
    await fireEvent.press(screen.getAllByText('Elegir cartera')[0]);
    await fireEvent.press(screen.getByText('Cuenta principal'));

    await fireEvent.press(screen.getByText('Elegir cartera'));
    await fireEvent.press(screen.getByText('Ahorro'));

    await fireEvent.press(screen.getByText('Crear recurrente'));

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    const payload = mockMutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: 'transfer',
      category: null,
      wallet: 'w1',
      to_wallet: 'w2',
    });
  });

  it('al editar, precarga tipo/cartera destino desde el recurrente existente', async () => {
    mockRecurringData = {
      id: 'r1',
      type: 'transfer',
      name: 'Aporte a ahorro',
      category: null,
      wallet: 'w1',
      to_wallet: 'w2',
      amount: '50.00',
      currency: 'USD',
      frequency: 'monthly',
      next_due_date: '2026-09-15',
      is_active: true,
    } as unknown as RecurringExpense;

    await render(<RecurringForm recurringId="r1" />);

    // El nombre va en un TextInput -- se consulta por su valor, no por texto.
    expect(screen.getByDisplayValue('Aporte a ahorro')).toBeTruthy();
    expect(screen.getByText('Ahorro')).toBeTruthy();
    expect(screen.queryByText('Categoría')).toBeNull();
  });
});
