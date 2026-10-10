import { fireEvent, render, screen } from '@testing-library/react-native';

import StatementDetailScreen from '@/app/(app)/statement/[id]';
import type { StatementCycle } from '@/api/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({ id: 'card' }),
}));

const mockCycle = (over: Partial<StatementCycle> = {}): StatementCycle => ({
  period_start: '2026-08-02',
  cutoff_date: '2026-09-01',
  payment_due_date: '2026-09-10',
  previous_balance: '100.00',
  purchases: '250.00',
  installments_charged: '0.00',
  payments: '100.00',
  adjustments: '0.00',
  statement_balance: '250.00',
  minimum_payment: '25.00',
  paid_since_cutoff: '50.00',
  remaining: '200.00',
  minimum_remaining: '0.00',
  status: 'minimum_paid',
  interest_if_minimum: '4.50',
  interest_if_unpaid: '4.00',
  ...over,
});

const mockRefetch = jest.fn();
jest.mock('@/api/queries', () => ({
  useWallet: () => ({ data: { id: 'card', name: 'Visa', currency: 'USD', interest_rate: '24.00' }, refetch: mockRefetch }),
  useWallets: () => ({
    data: [
      { id: 'card', kind: 'credit', is_default: false, is_archived: false },
      { id: 'bank', kind: 'bank', is_default: true, is_archived: false },
    ],
  }),
  useCreditCardStatement: () => ({ data: { installment_lines: [] }, refetch: mockRefetch }),
  useStatementCycles: () => ({
    data: {
      cycles: [mockCycle(), mockCycle({ cutoff_date: '2026-08-01', status: 'paid', remaining: '0.00' })],
      unbilled: {
        since: '2026-09-02', next_cutoff_date: '2026-10-01',
        purchases: '80.00', installments_next: '0.00', total: '80.00',
      },
    },
    isLoading: false, isError: false, isFetching: false, refetch: mockRefetch,
  }),
}));

beforeEach(() => mockPush.mockReset());

describe('StatementDetailScreen', () => {
  it('muestra contado vs. mínimo, del corte / después del corte, intereses y el detalle', async () => {
    await render(<StatementDetailScreen />);
    expect(screen.getByText('Pago de contado')).toBeTruthy();
    expect(screen.getByText('Pago mínimo')).toBeTruthy();
    expect(screen.getByText('Mínimo cubierto.')).toBeTruthy();
    expect(screen.getByText('Del corte')).toBeTruthy();
    expect(screen.getByText('Después del corte')).toBeTruthy();
    expect(screen.getByText('Si pagás sólo el mínimo')).toBeTruthy();
    expect(screen.getByText('Saldo al corte')).toBeTruthy();
  });

  it('«Registrar pago» abre una transferencia por lo que falta, desde la cartera por defecto', async () => {
    await render(<StatementDetailScreen />);
    await fireEvent.press(screen.getByText('Registrar pago'));
    const href = mockPush.mock.calls[0][0] as string;
    expect(href).toContain('prefillWallet=bank');
    expect(href).toContain('prefillToWallet=card');
    expect(href).toContain('prefillAmount=200.00');
  });

  it('un corte anterior no ofrece pagar ni el "después del corte"', async () => {
    await render(<StatementDetailScreen />);
    await fireEvent.press(screen.getByLabelText(/Corte del .*Pagado/));
    expect(screen.queryByText('Registrar pago')).toBeNull();
    expect(screen.queryByText('Después del corte')).toBeNull();
  });
});
