import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import StatementScanScreen from '@/screens/StatementScanScreen';
import type { StatementCandidate } from '@/api/types';

const mockScan = jest.fn();
const mockImport = jest.fn();

const CANDIDATE: StatementCandidate = {
  statement_kind: 'credit_card',
  period_start: '2026-09-16',
  period_end: '2026-10-15',
  payment_due_date: '2026-11-05',
  wallet: {
    kind: 'credit',
    purpose: 'debt',
    name: 'Banco Cuscatlán Visa ···· 9655',
    bank: 'Banco Cuscatlán',
    card_last4: '9655',
    currency: 'USD',
    credit_limit: '5000.00',
    billing_cycle_day: 15,
    payment_due_day: 5,
    minimum_payment: '62.50',
    interest_rate: '28.50',
    closing_balance: '1250.40',
  },
  transactions: [
    { date: '2026-09-20', description: 'SUPER SELECTOS', amount: '45.10', type: 'expense', category: 'cat-1', possible_duplicates: [] },
    { date: '2026-09-25', description: 'UBER', amount: '8.75', type: 'expense', category: null, possible_duplicates: [] },
    {
      date: '2026-10-01', description: 'PAGO', amount: '200.00', type: 'income', category: 'cat-2',
      possible_duplicates: [{ id: 'd1', date: '2026-10-01', amount: '200.00', description: 'Pago' }],
    },
  ],
  confidence: { bank: 'high', last4: 'high', closing_balance: 'low', period_end: 'high', transactions: 'medium' },
};

jest.mock('@/lib/receipt', () => ({
  pickReceiptDocument: jest.fn(async () => ({ uri: 'file://x.pdf', name: 'x.pdf', type: 'application/pdf' })),
  pickReceiptImage: jest.fn(),
}));
jest.mock('@/components/ui/ModalHeader', () => ({ dismissModal: jest.fn() }));
jest.mock('@/store/snackbar', () => ({ useSnackbarStore: (sel: (s: unknown) => unknown) => sel({ show: jest.fn() }) }));
jest.mock('@/api/queries', () => ({
  useAIStatus: () => ({ data: { enabled: true, quotas: { statement: { limit: 3, used: 0, remaining: 3 } } } }),
  useScanStatement: () => ({ mutateAsync: mockScan, isPending: false }),
  useImportStatement: () => ({ mutateAsync: mockImport, isPending: false }),
  useWallets: () => ({ data: [] }),
  useCategories: () => ({
    data: [{ id: 'cat-x', name: 'Transporte', type: 'expense', parent: 'g' }],
  }),
  useLoyaltyBanks: () => ({ data: [] }),
  useBankEmailSchemas: () => ({ data: [{ id: 'schema-1', bank_name: 'Banco Cuscatlan' }] }),
}));

async function scanned() {
  mockScan.mockResolvedValue(CANDIDATE);
  await render(<StatementScanScreen />);
  await fireEvent.press(screen.getByText('PDF'));
  await screen.findByText('Lo que se leyó');
}

describe('StatementScanScreen', () => {
  beforeEach(() => {
    mockScan.mockReset();
    mockImport.mockReset();
    mockImport.mockResolvedValue({ walletId: 'w1', created: 2, failed: [] });
  });

  it('muestra lo leído y marca «revisar» lo de baja confianza', async () => {
    await scanned();
    expect(screen.getByText('Banco Cuscatlán')).toBeTruthy();
    expect(screen.getByText('···· 9655')).toBeTruthy();
    expect(screen.getAllByText('revisar')).toHaveLength(1); // sólo el saldo
  });

  it('los posibles duplicados arrancan sin marcar', async () => {
    await scanned();
    expect(screen.getByText('Movimientos (2 de 3)')).toBeTruthy();
    expect(screen.getByText(/ya parece registrado/)).toBeTruthy();
  });

  it('pide categoría por defecto para lo que no la tiene y no deja confirmar sin ella', async () => {
    await scanned();
    expect(screen.getByText('Categoría para los gastos sin categoría')).toBeTruthy();
    const confirm = screen.getByRole('button', { name: /Crear cartera e importar 2/ });
    expect(confirm.props.accessibilityState?.disabled).toBe(true);
  });

  it('crea la cartera con saldo inicial que cuadra con el corte y banco cruzado por nombre', async () => {
    await scanned();
    await fireEvent.press(screen.getByText('Elige una categoría'));
    await fireEvent.press(screen.getByText('Transporte'));
    await fireEvent.press(screen.getByRole('button', { name: /Crear cartera e importar 2/ }));

    await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1));
    const args = mockImport.mock.calls[0][0];
    // seleccionados: gasto 45.10 + gasto 8.75 (el pago duplicado quedó fuera)
    // final = -1250.40 => inicial = -1250.40 + 45.10 + 8.75
    expect(args.wallet.opening_balance).toBe('-1196.55');
    expect(args.wallet.bank_schema).toBe('schema-1');
    expect(args.wallet.kind).toBe('credit');
    expect(args.wallet.billing_cycle_day).toBe(15);
    expect(args.transactions).toHaveLength(2);
    expect(args.transactions[1].category).toBe('cat-x'); // la por defecto
  });
});
