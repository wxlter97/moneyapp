import { render, screen } from '@testing-library/react-native';

import type { BudgetRow } from '@/api/types';
import { BudgetProgressRow } from '@/components/BudgetProgressRow';
import { formatMoney } from '@/lib/money';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const row = (overrides: Partial<BudgetRow>): BudgetRow => ({
  category: 'c1',
  category_name: 'Categoría',
  budgeted: '0.00',
  spent: '0.00',
  remaining: '0.00',
  provision: '0.00',
  ...overrides,
});

/** Texto del "spent" de la fila: el `Money` de gastado va antes que el de
 * presupuestado, así que cuando coinciden en cifra (ej. 6.00/6.00) es el
 * primer match. */
function spentText(amount: number) {
  return screen.getAllByText(formatMoney(amount, 'USD'))[0];
}

// Regresión de la auditoría de producto (§3.2 / P0-3): la barra de
// presupuesto se mostraba verde incluso al 100% exacto o sobregirada sin
// presupuesto asignado, porque la condición de "sobregiro" era `spent >
// budgeted` (excluye el empate) y exigía `budgeted > 0` (excluye "sin
// presupuesto"). Ambos casos deben marcarse como sobregiro ahora.
describe('BudgetProgressRow — estado de sobregiro', () => {
  it('categoría bien encaminada (50%) no muestra alerta y el gastado va en gris', async () => {
    await render(<BudgetProgressRow row={row({ budgeted: '10.00', spent: '5.00' })} />);
    expect(screen.queryByTestId('budget-row-alert')).toBeNull();
    expect(spentText(5).props.className).toContain('text-text-muted');
  });

  it('"Servicios" al 100% exacto (6.00/6.00) se marca como sobregiro, no como sana', async () => {
    await render(
      <BudgetProgressRow
        row={row({ category_name: 'Servicios', budgeted: '6.00', spent: '6.00' })}
      />,
    );
    expect(screen.getByTestId('budget-row-alert')).toBeTruthy();
    expect(spentText(6).props.className).toContain('text-expense');
  });

  it('"Miscelánea" gastada sin presupuesto (120.38/0.00) se marca como sobregiro', async () => {
    await render(
      <BudgetProgressRow
        row={row({ category_name: 'Miscelánea', budgeted: '0.00', spent: '120.38' })}
      />,
    );
    expect(screen.getByTestId('budget-row-alert')).toBeTruthy();
    expect(spentText(120.38).props.className).toContain('text-expense');
    expect(screen.getByText(/sin presupuesto/)).toBeTruthy();
  });

  it('categoría al 85% avisa "cerca del límite" (ámbar), sin tratarla como sobregiro', async () => {
    await render(<BudgetProgressRow row={row({ budgeted: '100.00', spent: '85.00' })} />);
    expect(screen.getByTestId('budget-row-alert')).toBeTruthy();
    expect(spentText(85).props.className).toContain('text-warning');
  });
});
