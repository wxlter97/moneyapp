import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProScreen from '@/app/(app)/pro';
import type { MyPlan, Plan } from '@/api/types';

// `ModalHeader`/`Screen` importan `expo-router` para el gesto de "volver" --
// mismo motivo que en TwoFactorScreen.test.tsx.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'budget://pro'),
}));

const mockMyPlanQuery = jest.fn();
const mockPlansQuery = jest.fn();
const mockCheckout = jest.fn();
const mockCancel = jest.fn();
const mockRedeem = jest.fn();

jest.mock('@/api/queries', () => ({
  useMyPlan: () => mockMyPlanQuery(),
  usePlans: () => mockPlansQuery(),
  useCheckout: () => ({ mutateAsync: mockCheckout, isPending: false }),
  useCancelSubscription: () => ({ mutateAsync: mockCancel, isPending: false }),
  useRedeemPromoCode: () => ({ mutateAsync: mockRedeem, isPending: false }),
}));

const FREE_PLAN: Plan = {
  id: 'plan-free',
  code: 'free',
  name: 'Gratis',
  description: '',
  is_default: true,
  max_workspaces_owned: 1,
  max_members_per_workspace: 2,
  max_active_recurring: 5,
  features: {},
  prices: [],
};

const PRO_PLAN: Plan = {
  id: 'plan-pro',
  code: 'pro',
  name: 'Pro',
  description: '',
  is_default: false,
  max_workspaces_owned: null,
  max_members_per_workspace: null,
  max_active_recurring: null,
  features: { import_email: true, export: false },
  prices: [
    { id: 'price-monthly', billing_period: 'monthly', amount: 1.99, currency: 'USD', is_active: true },
    { id: 'price-annual', billing_period: 'annual', amount: 19.99, currency: 'USD', is_active: true },
  ],
};

const PLUS_PLAN: Plan = {
  id: 'plan-plus',
  code: 'plus',
  name: 'Plus',
  description: '',
  is_default: false,
  max_workspaces_owned: 2,
  max_members_per_workspace: 5,
  max_active_recurring: 15,
  features: { export: true, net_worth_history: true, import_email: false },
  prices: [
    { id: 'price-plus-monthly', billing_period: 'monthly', amount: 0.99, currency: 'USD', is_active: true },
  ],
};

function myPlan(overrides: Partial<MyPlan> = {}, extra: Record<string, unknown> = {}) {
  return {
    data: { plan: FREE_PLAN, subscription: null, ...overrides },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...extra,
  };
}

describe('ProScreen', () => {
  beforeEach(() => {
    mockCheckout.mockReset().mockResolvedValue({ checkout_url: 'https://pay.example.com/x', subscription_id: 's1' });
    mockCancel.mockReset().mockResolvedValue({ id: 's1', status: 'canceled' });
    mockRedeem.mockReset();
    mockPlansQuery.mockReset().mockReturnValue({ data: [FREE_PLAN, PRO_PLAN], isLoading: false });
    jest.spyOn(Linking, 'openURL').mockReset().mockResolvedValue(true as never);
  });

  it('en el plan gratis, muestra los límites reales y solo las features en `true`', async () => {
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    expect(screen.getByText('Estás en el plan Gratis')).toBeTruthy();
    expect(screen.getByText(/1 presupuesto, 2 miembros por presupuesto, 5 recurrentes activos/)).toBeTruthy();
    expect(screen.getByText('Importación automática por correo')).toBeTruthy();
    expect(screen.queryByText('Exportar tus datos')).toBeNull(); // `export: false` en el fixture
  });

  it('lista los precios activos del plan Pro', async () => {
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    expect(screen.getByRole('button', { name: 'Mensual · USD 1.99' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Anual · USD 19.99' })).toBeTruthy();
  });

  it('con más de un plan pago, muestra cada uno con sus propias features y precios', async () => {
    mockPlansQuery.mockReturnValue({ data: [FREE_PLAN, PRO_PLAN, PLUS_PLAN], isLoading: false });
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    // Plus (USD 0.99) va antes que Pro (USD 1.99): más barato primero.
    // ("Pro" también es el título del header, así que no se busca por ese texto solo.)
    expect(screen.getByText('Plus')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mensual · USD 0.99' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mensual · USD 1.99' })).toBeTruthy();
    expect(screen.getByText('Historial de patrimonio neto')).toBeTruthy(); // feature de Plus
  });

  it('elegir un precio arranca el checkout y abre la URL devuelta', async () => {
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Mensual · USD 1.99' }));

    expect(mockCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ plan_price: 'price-monthly', success_url: 'budget://pro', cancel_url: 'budget://pro' }),
    );
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://pay.example.com/x'));
  });

  it('si el checkout falla, muestra el error del backend en vez de abrir nada', async () => {
    mockCheckout.mockReset().mockRejectedValue(new Error('Proveedor no configurado todavía.'));
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Mensual · USD 1.99' }));

    expect(await screen.findByText('Proveedor no configurado todavía.')).toBeTruthy();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('con una suscripción activa, muestra "Tenés Pro" y la opción de cancelar', async () => {
    mockMyPlanQuery.mockReturnValue(
      myPlan({
        plan: PRO_PLAN,
        subscription: {
          id: 's1',
          plan: PRO_PLAN,
          billing_period: 'monthly',
          status: 'active',
          provider: 'manual',
          current_period_end: null,
          canceled_at: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
    await render(<ProScreen />);

    expect(screen.getByText('Tenés Pro')).toBeTruthy();
    expect(screen.queryByText('Elegí tu plan')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar suscripción' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar suscripción' }));
    expect(mockCancel).toHaveBeenCalled();
  });

  it('canjear un código válido muestra confirmación con el plan obtenido', async () => {
    mockRedeem.mockResolvedValue({
      id: 'sub-promo',
      plan: PRO_PLAN,
      billing_period: null,
      status: 'active',
      provider: 'manual',
      current_period_end: null,
      canceled_at: null,
      created_at: '2026-01-01T00:00:00Z',
    });
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    await fireEvent.changeText(screen.getByLabelText('Código'), 'beta2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Canjear' }));

    expect(mockRedeem).toHaveBeenCalledWith('beta2026');
    expect(await screen.findByText('¡Listo! Ya tenés Pro.')).toBeTruthy();
  });

  it('un código inválido muestra el error del backend sin tocar el plan', async () => {
    mockRedeem.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { code: ['Código inválido o vencido.'] } },
    });
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    await fireEvent.changeText(screen.getByLabelText('Código'), 'NOEXISTE');
    await fireEvent.press(screen.getByRole('button', { name: 'Canjear' }));

    expect(await screen.findByText('Código inválido o vencido.')).toBeTruthy();
  });

  it('con una suscripción activa, no ofrece canjear un código', async () => {
    mockMyPlanQuery.mockReturnValue(
      myPlan({
        plan: PRO_PLAN,
        subscription: {
          id: 's1',
          plan: PRO_PLAN,
          billing_period: 'monthly',
          status: 'active',
          provider: 'manual',
          current_period_end: null,
          canceled_at: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
    await render(<ProScreen />);

    expect(screen.queryByLabelText('Código')).toBeNull();
  });
});
