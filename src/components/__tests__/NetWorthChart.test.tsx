import { render, screen } from '@testing-library/react-native';

import type { MonthlySnapshot } from '@/api/types';
import { NetWorthChart } from '@/components/NetWorthChart';

function snapshot(overrides: Partial<MonthlySnapshot>): MonthlySnapshot {
  return {
    id: 's1',
    month: 1,
    year: 2026,
    total_net_worth: '1000.00',
    total_income: '0.00',
    total_expenses: '0.00',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// El caso de 0 snapshots lo resuelve `NetWorthHistoryScreen` con `EmptyState`
// (no pasa por acá). Esto prueba el caso que la auditoría de producto
// encontró sin manejar: 1-2 puntos se dibujan igual (datos reales, nunca se
// ocultan) pero avisan que no alcanzan para una tendencia.
describe('NetWorthChart — aviso de "poca historia"', () => {
  it('con 1 punto muestra el aviso', async () => {
    await render(<NetWorthChart snapshots={[snapshot({ id: 's1' })]} />);
    expect(screen.getByTestId('net-worth-chart-hint')).toBeTruthy();
    expect(screen.getByText(/llevás 1 mes\./)).toBeTruthy();
  });

  it('con 2 puntos muestra el aviso, en plural', async () => {
    await render(
      <NetWorthChart snapshots={[snapshot({ id: 's1' }), snapshot({ id: 's2' })]} />,
    );
    expect(screen.getByText(/llevás 2 meses\./)).toBeTruthy();
  });

  it('con 3 o más puntos ya no muestra el aviso', async () => {
    await render(
      <NetWorthChart
        snapshots={[snapshot({ id: 's1' }), snapshot({ id: 's2' }), snapshot({ id: 's3' })]}
      />,
    );
    expect(screen.queryByTestId('net-worth-chart-hint')).toBeNull();
  });

  it('con 0 puntos no muestra el aviso (lo resuelve el EmptyState de la pantalla)', async () => {
    await render(<NetWorthChart snapshots={[]} />);
    expect(screen.queryByTestId('net-worth-chart-hint')).toBeNull();
  });
});
