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
const mockStartTrial = jest.fn();

jest.mock('@/api/queries', () => ({
  useMyPlan: () => mockMyPlanQuery(),
  usePlans: () => mockPlansQuery(),
  useCheckout: () => ({ mutateAsync: mockCheckout, isPending: false }),
  useCancelSubscription: () => ({ mutateAsync: mockCancel, isPending: false }),
  useRedeemPromoCode: () => ({ mutateAsync: mockRedeem, isPending: false }),
  useStartTrial: () => ({ mutateAsync: mockStartTrial, isPending: false }),
}));

const FREE_PLAN: Plan = {
  id: 'plan-free',
  code: 'free',
  name: 'Gratis',
  description: '',
  is_default: true,
  trial_days: null,
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
  trial_days: 14,
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
  trial_days: null,
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
    mockStartTrial.mockReset();
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
          is_trial: false,
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

  it('con un plan pago, ofrece cambiar a otro y deja deshabilitado el precio actual', async () => {
    mockPlansQuery.mockReturnValue({ data: [FREE_PLAN, PRO_PLAN, PLUS_PLAN], isLoading: false });
    mockMyPlanQuery.mockReturnValue(
      myPlan({
        plan: PLUS_PLAN,
        subscription: {
          id: 's1',
          plan: PLUS_PLAN,
          billing_period: 'monthly',
          status: 'active',
          provider: 'wompi',
          is_trial: false,
          current_period_end: '2026-12-01T00:00:00Z',
          canceled_at: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
    await render(<ProScreen />);

    expect(screen.getByText('Tenés Plus')).toBeTruthy();
    const current = screen.getByRole('button', { name: 'Mensual · USD 0.99 · Tu plan actual' });
    expect(current.props.accessibilityState?.disabled).toBe(true);
    // La prueba gratis de Pro no se ofrece teniendo ya un plan pago.
    expect(screen.queryByRole('button', { name: /Probar gratis/ })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Anual · USD 19.99' }));
    await waitFor(() =>
      expect(mockCheckout).toHaveBeenCalledWith(expect.objectContaining({ plan_price: 'price-annual' })),
    );
  });

  it('muestra las cuotas de IA con su cantidad, no la clave cruda', async () => {
    mockPlansQuery.mockReturnValue({
      data: [
        FREE_PLAN,
        { ...PRO_PLAN, features: { ai_receipts_per_month: 30, ai_chats_per_month: 0, ai_parses_per_month: null } },
      ],
      isLoading: false,
    });
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    expect(screen.getByText('30 recibos leídos con IA al mes')).toBeTruthy();
    expect(screen.getByText('Carga con IA escribiendo una frase, ilimitada')).toBeTruthy();
    expect(screen.queryByText(/ai_/)).toBeNull();
    expect(screen.queryByText(/asistente/)).toBeNull(); // 0 = no incluido
  });

  it('canjear un código válido muestra confirmación con el plan obtenido', async () => {
    mockRedeem.mockResolvedValue({
      id: 'sub-promo',
      plan: PRO_PLAN,
      billing_period: null,
      status: 'active',
      provider: 'manual',
      is_trial: false,
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

  it('muestra los detalles completos de la suscripción (estado, método, fechas)', async () => {
    mockMyPlanQuery.mockReturnValue(
      myPlan({
        plan: PRO_PLAN,
        subscription: {
          id: 's1',
          plan: PRO_PLAN,
          billing_period: 'annual',
          status: 'active',
          provider: 'wompi',
          is_trial: false,
          current_period_end: '2027-01-01T00:00:00Z',
          canceled_at: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
    await render(<ProScreen />);

    expect(screen.getByText('Activa')).toBeTruthy();
    expect(screen.getByText('Wompi')).toBeTruthy();
    expect(screen.getByText('Anual')).toBeTruthy();
    expect(screen.getByText('Vence')).toBeTruthy();
  });

  it('cancelada pero con fecha de vencimiento futura sigue activa y lo aclara', async () => {
    mockMyPlanQuery.mockReturnValue(
      myPlan({
        plan: PRO_PLAN,
        subscription: {
          id: 's1',
          plan: PRO_PLAN,
          billing_period: 'monthly',
          status: 'active',
          provider: 'manual',
          is_trial: false,
          current_period_end: '2026-02-01T00:00:00Z',
          canceled_at: '2026-01-15T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
    await render(<ProScreen />);

    expect(screen.getByText('Activa · no se renueva')).toBeTruthy();
    expect(screen.getByText('Vencía')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar suscripción' })).toBeNull();
  });

  it('una suscripción ya cancelada muestra "Vencía"/"Cancelada el" y no ofrece cancelar de nuevo', async () => {
    mockMyPlanQuery.mockReturnValue(
      myPlan({
        plan: PRO_PLAN,
        subscription: {
          id: 's1',
          plan: PRO_PLAN,
          billing_period: 'monthly',
          status: 'canceled',
          provider: 'manual',
          is_trial: false,
          current_period_end: '2026-02-01T00:00:00Z',
          canceled_at: '2026-01-15T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
    await render(<ProScreen />);

    expect(screen.getByText('Cancelada')).toBeTruthy();
    expect(screen.getByText('Vencía')).toBeTruthy();
    expect(screen.getByText('Cancelada el')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar suscripción' })).toBeNull();
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
          is_trial: false,
          current_period_end: null,
          canceled_at: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
    await render(<ProScreen />);

    expect(screen.queryByLabelText('Código')).toBeNull();
  });

  it('un plan con prueba gratis ofrece "Probar gratis" y arranca la prueba', async () => {
    mockStartTrial.mockResolvedValue({
      id: 'sub-trial',
      plan: PRO_PLAN,
      billing_period: null,
      status: 'active',
      provider: 'manual',
      is_trial: true,
      current_period_end: '2026-02-01T00:00:00Z',
      canceled_at: null,
      created_at: '2026-01-01T00:00:00Z',
    });
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    // Plus (fixture del beforeEach no la incluye) no tiene trial_days -- sólo Pro ofrece el botón.
    await fireEvent.press(screen.getByRole('button', { name: 'Probar gratis 14 días' }));

    expect(mockStartTrial).toHaveBeenCalledWith('plan-pro');
  });

  it('si empezar la prueba falla, muestra el error del backend', async () => {
    mockStartTrial.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { plan: ['Ya usaste tu período de prueba gratis.'] } },
    });
    mockMyPlanQuery.mockReturnValue(myPlan());
    await render(<ProScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Probar gratis 14 días' }));

    expect(await screen.findByText('Ya usaste tu período de prueba gratis.')).toBeTruthy();
  });
});
