import { fireEvent, render, screen } from '@testing-library/react-native';

import StatementDetailScreen from '@/app/(app)/statement/[id]';
import type { PaymentGuidance, StatementCycle } from '@/api/types';
import { formatMoney } from '@/lib/money';

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
  paid_on_time: '50.00',
  remaining: '200.00',
  minimum_remaining: '0.00',
  status: 'minimum_paid',
  interest_if_minimum: '4.50',
  interest_if_unpaid: '4.00',
  ...over,
});

const mockGuidance: PaymentGuidance = {
  phase: 'due',
  status: 'minimum_paid',
  amount: '200.00',
  statement_balance: '250.00',
  minimum_remaining: '0.00',
  cutoff_date: '2026-09-01',
  due_date: '2026-09-10',
  days_left: 3,
  next_cutoff_date: '2026-10-01',
  next_statement_so_far: '80.00',
  payoff_today: '280.00',
};

const mockRefetch = jest.fn();
jest.mock('@/api/queries', () => ({
  useWallet: () => ({ data: { id: 'card', name: 'Visa', currency: 'USD', interest_rate: '24.00' }, refetch: mockRefetch }),
  useWallets: () => ({
    data: [
      { id: 'card', kind: 'credit', purpose: 'debt', currency: 'USD', is_active: true, is_default: false, is_archived: false, current_balance: '-330.00' },
      { id: 'bank', kind: 'bank', purpose: 'spending', currency: 'USD', is_active: true, is_default: true, is_archived: false, current_balance: '150.00' },
    ],
  }),
  useCreditCardStatement: () => ({
    data: {
      installment_lines: [
        {
          id: 'tv', description: 'TV', installments_pending: 2, installments_total: 3,
          amount_pending: '200.00', next_installment_amount: '100.00', next_installment_cutoff: '2026-10-01',
        },
      ],
    },
    refetch: mockRefetch,
  }),
  useStatementCycles: () => ({
    data: {
      cycles: [mockCycle(), mockCycle({ cutoff_date: '2026-08-01', status: 'paid', remaining: '0.00' })],
      unbilled: {
        since: '2026-09-02', next_cutoff_date: '2026-10-01',
        purchases: '80.00', installments_next: '0.00', total: '80.00',
      },
      guidance: mockGuidance,
    },
    isLoading: false, isError: false, isFetching: false, refetch: mockRefetch,
  }),
}));

beforeEach(() => mockPush.mockReset());

describe('StatementDetailScreen', () => {
  it('arriba dice cuánto pagar y hasta cuándo; abajo, este estado / el próximo y cómo se llegó al total', async () => {
    await render(<StatementDetailScreen />);
    expect(screen.getByLabelText(`Paga ${formatMoney(200, 'USD')} antes del 10 sep. Faltan 3 días · así no pagas intereses`)).toBeTruthy();
    expect(screen.getByText('Te falta')).toBeTruthy();
    expect(screen.getByText('Mínimo cubierto ✓')).toBeTruthy();
    expect(screen.getByText('Para quedar al día por completo')).toBeTruthy();
    expect(screen.getByText('Este estado')).toBeTruthy();
    expect(screen.getByText('Va al próximo estado')).toBeTruthy();
    expect(screen.getByText('Total del estado')).toBeTruthy();
    expect(screen.getByText(/Cuota del corte 1 oct · quedan 2 de/)).toBeTruthy();
  });

  it('«Registrar pago» abre una transferencia por lo que falta, desde la cartera por defecto', async () => {
    await render(<StatementDetailScreen />);
    await fireEvent.press(screen.getByText('Registrar pago'));
    const href = mockPush.mock.calls[0][0] as string;
    expect(href).toContain('prefillWallet=bank');
    expect(href).toContain('prefillToWallet=card');
    expect(href).toContain('prefillAmount=200.00');
  });

  it('«Pagar todo» incluye lo de después del corte', async () => {
    await render(<StatementDetailScreen />);
    await fireEvent.press(screen.getByText('Pagar todo'));
    expect(mockPush.mock.calls[0][0] as string).toContain('prefillAmount=280.00');
  });

  it('el planificador muestra intereses de lo que quede y si alcanza', async () => {
    await render(<StatementDetailScreen />);
    await fireEvent.changeText(screen.getByLabelText('Monto a pagar'), '100');
    // Quedan 100 del estado: 24% anual = 2 al mes.
    expect(screen.getByText(/Quedarían/)).toBeTruthy();
    expect(screen.getByText(/te alcanza/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Monto a pagar'), '280');
    expect(screen.getByText(/te faltan/)).toBeTruthy();
    expect(screen.getByText(/Cubre el estado/)).toBeTruthy();
  });

  it('el glosario se abre al tocarlo', async () => {
    await render(<StatementDetailScreen />);
    expect(screen.queryByText('Pagar todo', { exact: false })).toBeTruthy();
    await fireEvent.press(screen.getByText('¿Qué significa cada cosa?'));
    expect(screen.getByText(/Lo menos que puedes pagar para evitar el recargo/)).toBeTruthy();
  });

  it('un corte anterior no ofrece pagar ni el "va al próximo estado"', async () => {
    await render(<StatementDetailScreen />);
    await fireEvent.press(screen.getByLabelText(/Corte del .*Pagado/));
    expect(screen.queryByText('Registrar pago')).toBeNull();
    expect(screen.queryByText('Va al próximo estado')).toBeNull();
    expect(screen.getAllByText('Total del estado')).toHaveLength(2);
  });
});
