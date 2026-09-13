import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ProFeatureGate } from '@/components/ProFeatureGate';
import type { Plan } from '@/api/types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

const mockMyPlanQuery = jest.fn();
jest.mock('@/api/queries', () => ({
  useMyPlan: () => mockMyPlanQuery(),
}));

function planWith(features: Record<string, boolean>): Plan {
  return {
    id: 'p1', code: 'free', name: 'Gratis', description: '',
    max_workspaces_owned: null, max_members_per_workspace: null, max_active_recurring: null,
    features, prices: [],
  };
}

describe('ProFeatureGate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mientras carga el plan, no muestra ni el contenido ni el upsell (variant screen)', async () => {
    mockMyPlanQuery.mockReturnValue({ isLoading: true, data: undefined });
    await render(
      <ProFeatureGate feature="backup">
        <Text>Contenido Pro</Text>
      </ProFeatureGate>,
    );
    expect(screen.queryByText('Contenido Pro')).toBeNull();
    expect(screen.queryByText('Pasate a Pro')).toBeNull();
  });

  it('sin plan resuelto (fail-open), muestra el contenido', async () => {
    mockMyPlanQuery.mockReturnValue({ isLoading: false, data: { plan: null, subscription: null } });
    await render(
      <ProFeatureGate feature="backup">
        <Text>Contenido Pro</Text>
      </ProFeatureGate>,
    );
    expect(screen.getByText('Contenido Pro')).toBeTruthy();
  });

  it('con la feature en false, reemplaza el contenido por el upsell', async () => {
    mockMyPlanQuery.mockReturnValue({
      isLoading: false,
      data: { plan: planWith({ backup: false }), subscription: null },
    });
    await render(
      <ProFeatureGate feature="backup">
        <Text>Contenido Pro</Text>
      </ProFeatureGate>,
    );
    expect(screen.queryByText('Contenido Pro')).toBeNull();
    expect(screen.getByText('Respaldo y restauración')).toBeTruthy();

    await fireEvent.press(screen.getByText('Pasate a Pro'));
    expect(router.push).toHaveBeenCalledWith('/pro');
  });

  it('con la feature en true, muestra el contenido', async () => {
    mockMyPlanQuery.mockReturnValue({
      isLoading: false,
      data: { plan: planWith({ backup: true }), subscription: null },
    });
    await render(
      <ProFeatureGate feature="backup">
        <Text>Contenido Pro</Text>
      </ProFeatureGate>,
    );
    expect(screen.getByText('Contenido Pro')).toBeTruthy();
  });

  it('variant inline arma un Card en vez de ocupar toda la pantalla', async () => {
    mockMyPlanQuery.mockReturnValue({
      isLoading: false,
      data: { plan: planWith({ multi_currency: false }), subscription: null },
    });
    await render(
      <ProFeatureGate feature="multi_currency" variant="inline">
        <Text>Tasas</Text>
      </ProFeatureGate>,
    );
    expect(screen.getByText('Múltiples monedas')).toBeTruthy();
    expect(screen.queryByText('Tasas')).toBeNull();
  });
});
