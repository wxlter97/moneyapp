import { render, screen } from '@testing-library/react-native';

import type { Category, Transaction, Wallet } from '@/api/types';
import { CategoryForm } from '@/components/CategoryForm';
import { TransactionForm } from '@/components/TransactionForm';

// Los formularios precargan sus campos durante el render (no en un efecto): estos
// tests fijan que el resultado sigue siendo el mismo -- valores puestos en la primera
// pasada visible y sin pisar lo que la persona escribe después.

const mockTransaction = jest.fn();
const mockCuenta = { id: 'w1', name: 'Cuenta principal', currency: 'USD', is_default: false, purpose: 'spending' } as Wallet;
const mockDefault = { id: 'w2', name: 'Tarjeta favorita', currency: 'USD', is_default: true, purpose: 'spending' } as Wallet;
const mockComida = { id: 'c1', name: 'Comida', type: 'expense', icon: '', color: '', parent: null, is_group: false } as Category;

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/components/ui/ModalHeader', () => ({
  dismissModal: jest.fn(),
  ModalHeader: () => null,
}));
jest.mock('@/lib/modal', () => ({ dismissModal: jest.fn() }));

// Hijos que hablan con la IA, los recibos o las etiquetas: no forman parte de lo que se prueba.
jest.mock('@/components/ParseTextField', () => ({ ParseTextField: () => null }));
jest.mock('@/components/ReceiptScanButton', () => ({ ReceiptScanButton: () => null }));
jest.mock('@/components/ReceiptField', () => ({ ReceiptField: () => null }));
jest.mock('@/components/TagPicker', () => ({ TagPicker: () => null }));
jest.mock('@/components/VoiceInputButton', () => ({ VoiceInputButton: () => null }));

const mockNone = { mutateAsync: jest.fn(), isPending: false };
jest.mock('@/api/queries', () => ({
  checkDuplicateTransaction: jest.fn(async () => []),
  useAIStatus: () => ({ data: undefined }),
  useCardProducts: () => ({ data: [] }),
  useLoyaltyMerchants: () => ({ data: [] }),
  useCategories: () => ({ data: [mockComida], isLoading: false }),
  useCreateTransaction: () => mockNone,
  useDeleteTransaction: () => mockNone,
  useHasFeature: () => false,
  useRegisterRefund: () => mockNone,
  useTransaction: (id?: string) => mockTransaction(id),
  useUpdateTransaction: () => mockNone,
  useUploadReceipt: () => mockNone,
  useWallets: () => ({ data: [mockCuenta, mockDefault], isLoading: false }),
}));
jest.mock('@/api/queries/lookups', () => ({
  ...jest.requireActual('@/api/queries/lookups'),
  useAssignableWallets: () => ({ data: [mockCuenta, mockDefault], query: { isLoading: false } }),
}));

const saved = {
  id: 't1', type: 'expense', amount: '25.00', currency: 'USD', description: 'Almuerzo de prueba',
  date: '2026-08-10', wallet: 'w1', to_wallet: null, category: 'c1', counts_toward_budget: true,
  tags: [], is_refundable: false, is_autopay: false, merchant: null, has_receipt: false, loyalty_earnings: [],
} as unknown as Transaction;

beforeEach(() => {
  jest.clearAllMocks();
  mockTransaction.mockReturnValue({ data: undefined, isLoading: false });
});

describe('TransactionForm: precarga', () => {
  it('al crear, deja elegida la cartera predeterminada', async () => {
    await render(<TransactionForm />);
    expect(await screen.findByText('Tarjeta favorita')).toBeTruthy();
  });

  it('al editar, precarga la nota y la cartera de la transacción guardada', async () => {
    mockTransaction.mockReturnValue({ data: saved, isLoading: false });
    await render(<TransactionForm transactionId="t1" />);
    expect(await screen.findByDisplayValue('Almuerzo de prueba')).toBeTruthy();
    expect(screen.getByText('Cuenta principal')).toBeTruthy();
    // La predeterminada NO pisa la de la transacción que se edita.
    expect(screen.queryByText('Tarjeta favorita')).toBeNull();
  });

  it('al duplicar, copia los datos pero usa la cartera de la original', async () => {
    mockTransaction.mockReturnValue({ data: saved, isLoading: false });
    await render(<TransactionForm duplicateFromId="t1" />);
    expect(await screen.findByDisplayValue('Almuerzo de prueba')).toBeTruthy();
    expect(screen.getByText('Cuenta principal')).toBeTruthy();
  });

  it('desde un ítem programado, precarga nota y cartera del prefill', async () => {
    await render(
      <TransactionForm
        prefill={{
          type: 'expense', amount: '12.50', categoryId: 'c1', walletId: 'w1', toWalletId: null,
          date: '2026-08-15', note: 'Suscripción',
        } as never}
      />,
    );
    expect(await screen.findByDisplayValue('Suscripción')).toBeTruthy();
    expect(screen.getByText('Cuenta principal')).toBeTruthy();
    expect(screen.queryByText('Tarjeta favorita')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CategoryForm
// ---------------------------------------------------------------------------
const mockCategories: { current: Category[] } = { current: [] };
const mockCategoryQueries = {
  useCategories: () => ({ data: mockCategories.current, isLoading: false }),
};
Object.assign(jest.requireMock('@/api/queries'), mockCategoryQueries, {
  useCreateCategory: () => mockNone,
  useUpdateCategory: () => mockNone,
  useDeleteCategory: () => mockNone,
  useLoyaltyCategoryTypes: () => ({ data: [] }),
});

describe('CategoryForm: precarga', () => {
  const grupo = {
    id: 'g1', name: 'Ingresos varios', type: 'income', icon: '', color: '', parent: null, is_group: true,
  } as Category;
  const hija = {
    id: 'c9', name: 'Freelance', type: 'income', icon: '💼', color: '#22C55E', parent: 'g1',
    is_group: false, category_type: null,
  } as unknown as Category;

  it('al editar, precarga el nombre guardado', async () => {
    mockCategories.current = [grupo, hija];
    await render(<CategoryForm categoryId="c9" />);
    expect(await screen.findByDisplayValue('Freelance')).toBeTruthy();
  });

  it('al crear una subcategoría, deja preseleccionado el grupo', async () => {
    mockCategories.current = [grupo];
    await render(<CategoryForm initialParent="g1" />);
    expect(await screen.findByText('Ingresos varios')).toBeTruthy();
  });
});
