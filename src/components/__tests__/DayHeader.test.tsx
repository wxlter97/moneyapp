import { render, screen } from '@testing-library/react-native';

import { DayHeader } from '@/components/DayHeader';

// Fecha LOCAL (no `toISOString()`, que es UTC) -- mismo criterio que
// `todayISO` en `lib/date.ts`, para no desalinearse cerca de medianoche en
// husos horarios donde UTC y local caen en días distintos.
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Auditoría de producto §11: una transacción real con fecha futura se veía
// igual que cualquier día del historial, sin nada que la distinga. Las
// fechas se calculan relativas a "ahora" (no una fecha fija) para no
// depender de cuándo se corra el test.
describe('DayHeader', () => {
  it('un día pasado no muestra "próximo"', async () => {
    await render(<DayHeader date={isoDaysFromNow(-1)} />);
    expect(screen.queryByText('próximo')).toBeNull();
  });

  it('un día futuro muestra "próximo"', async () => {
    await render(<DayHeader date={isoDaysFromNow(3)} />);
    expect(screen.getByText('próximo')).toBeTruthy();
  });

  it('con `net`, muestra el monto con signo', async () => {
    await render(<DayHeader date={isoDaysFromNow(-1)} net={42.5} currency="USD" />);
    expect(screen.getByText('+USD 42.50')).toBeTruthy();
  });

  it('sin `net`, no muestra ningún monto', async () => {
    await render(<DayHeader date={isoDaysFromNow(-1)} />);
    expect(screen.queryByText(/USD/)).toBeNull();
  });
});
