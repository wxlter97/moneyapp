import { render, screen } from '@testing-library/react-native';

import { BudgetMeter } from '@/components/ui/BudgetMeter';
import { formatMoney } from '@/lib/money';

// El medidor reemplaza el anillo de `budgets.tsx` (Fase 3, identidad
// wxlter.) -- misma semántica de 3 estados que `BudgetProgressRow`
// (`budgetState`, compartida), sólo cambia cómo se dibuja: acá se prueba lo
// que un lector de pantalla y el rótulo del pin de límite exponen, no
// posiciones/anchos de SVG (eso lo cubrió la maqueta visual).
describe('BudgetMeter', () => {
  it('dentro del presupuesto: accessibilityLabel dice "dentro del presupuesto"', async () => {
    await render(<BudgetMeter spent={420} budgeted={800} size="lg" />);
    expect(screen.getByLabelText(/dentro del presupuesto/)).toBeTruthy();
  });

  it('cerca del límite (≥80%): accessibilityLabel dice "cerca del límite"', async () => {
    await render(<BudgetMeter spent={680} budgeted={800} size="lg" />);
    expect(screen.getByLabelText(/cerca del límite/)).toBeTruthy();
  });

  it('excedido: accessibilityLabel dice "excedido"', async () => {
    await render(<BudgetMeter spent={962} budgeted={800} size="lg" />);
    expect(screen.getByLabelText(/excedido/)).toBeTruthy();
  });

  it('sin presupuesto asignado: muestra el rótulo "SIN PRESUPUESTO" y no un pin de límite', async () => {
    await render(<BudgetMeter spent={120.38} budgeted={0} size="lg" />);
    expect(screen.getByText('SIN PRESUPUESTO')).toBeTruthy();
    expect(screen.queryByText('LÍMITE')).toBeNull();
    expect(screen.getByLabelText(/Sin presupuesto asignado/)).toBeTruthy();
  });

  it('tamaño "lg" muestra el pin "LÍMITE" (identidad, no semántica)', async () => {
    await render(<BudgetMeter spent={420} budgeted={800} size="lg" />);
    expect(screen.getByText('LÍMITE')).toBeTruthy();
  });

  it('tamaño "sm" (filas de categoría) no muestra el rótulo del pin', async () => {
    await render(<BudgetMeter spent={420} budgeted={800} size="sm" />);
    expect(screen.queryByText('LÍMITE')).toBeNull();
  });

  it('showTicks agrega $0 y el monto presupuestado bajo la pista', async () => {
    await render(<BudgetMeter spent={420} budgeted={800} currency="USD" size="lg" showTicks />);
    expect(screen.getByText(formatMoney(0, 'USD'))).toBeTruthy();
    expect(screen.getByText(formatMoney(800, 'USD'))).toBeTruthy();
  });

  it('sin showTicks no muestra las etiquetas de la pista', async () => {
    await render(<BudgetMeter spent={420} budgeted={800} currency="USD" size="lg" />);
    expect(screen.queryByText(formatMoney(800, 'USD'))).toBeNull();
  });
});
