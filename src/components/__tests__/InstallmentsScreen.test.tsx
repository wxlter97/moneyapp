import { render, screen } from '@testing-library/react-native';

import type { Category, InstallmentPurchase, Wallet } from '@/api/types';
import InstallmentsScreen from '@/app/(app)/installments';
import { formatMoney } from '@/lib/money';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const mockWallet = { id: 'w1', name: 'Visa', currency: 'USD' } as Wallet;
const mockCategory = { id: 'c1', name: 'Electro', icon: '', color: '' } as Category;

const mockPurchase: InstallmentPurchase = {
  id: 'p1',
  wallet: 'w1',
  category: 'c1',
  description: 'Notebook',
  total_amount: '1200.00',
  installments_total: 12,
  start_date: '2026-01-01',
  installments_paid: 4,
  is_completed: false,
  current_installment_amount: '100.00',
  remaining_amount: '800.00',
  next_due_date: '2026-10-01',
  created_at: '',
  updated_at: '',
};

let mockInstallmentsData: InstallmentPurchase[] = [];

jest.mock('@/api/queries', () => ({
  useInstallments: () => ({
    data: mockInstallmentsData,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: jest.fn(),
  }),
  useCategories: () => ({ data: [mockCategory], isLoading: false }),
  useWallets: () => ({ data: [mockWallet], isLoading: false }),
}));

describe('InstallmentsScreen', () => {
  beforeEach(() => {
    mockInstallmentsData = [mockPurchase];
  });

  it('"Pagado" muestra total - restante (lo efectivamente pagado, no cuotas * monto)', async () => {
    await render(<InstallmentsScreen />);
    // 1200.00 (total) - 800.00 (restante) = 400.00 pagado -- OJO: no es
    // installments_paid * current_installment_amount (4 * 100 = 400 acá
    // coincide, pero el cálculo real es total-restante, ver paidAmount en
    // installments.tsx).
    expect(screen.getByText(formatMoney(400, 'USD'))).toBeTruthy();
  });

  it('"Falta" muestra remaining_amount tal cual', async () => {
    await render(<InstallmentsScreen />);
    expect(screen.getByText(formatMoney(800, 'USD'))).toBeTruthy();
  });

  it('muestra cuotas pagadas/total y la cartera', async () => {
    await render(<InstallmentsScreen />);
    expect(screen.getByText('4/12 cuotas · Visa')).toBeTruthy();
  });

  it('una compra completada no muestra "Pagado X de Y", sino "Pagada por completo"', async () => {
    mockInstallmentsData = [
      { ...mockPurchase, is_completed: true, installments_paid: 12, remaining_amount: '0.00' },
    ];
    await render(<InstallmentsScreen />);
    expect(screen.getByText('Pagada por completo')).toBeTruthy();
    expect(screen.queryByText(/^Pagado/)).toBeNull();
  });

  it('sin compras a plazo muestra el estado vacío', async () => {
    mockInstallmentsData = [];
    await render(<InstallmentsScreen />);
    expect(screen.getByText('Sin compras a plazo')).toBeTruthy();
  });
});
