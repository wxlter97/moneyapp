import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalendarGrid } from '@/components/CalendarGrid';

describe('CalendarGrid', () => {
  it('renderiza los 31 días de agosto 2026', async () => {
    await render(
      <CalendarGrid month={{ year: 2026, month: 8 }} selected="2026-08-13" markers={{}} onSelectDay={jest.fn()} />,
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });

  it('febrero de un año bisiesto llega hasta el 29', async () => {
    await render(
      <CalendarGrid month={{ year: 2024, month: 2 }} selected="2024-02-01" markers={{}} onSelectDay={jest.fn()} />,
    );
    expect(screen.getByText('29')).toBeTruthy();
  });

  it('febrero de un año NO bisiesto no pasa del 28', async () => {
    await render(
      <CalendarGrid month={{ year: 2026, month: 2 }} selected="2026-02-01" markers={{}} onSelectDay={jest.fn()} />,
    );
    expect(screen.getByText('28')).toBeTruthy();
    expect(screen.queryByText('29')).toBeNull();
  });

  it('llama a onSelectDay con el ISODate correcto al tocar un día', async () => {
    const onSelectDay = jest.fn();
    await render(
      <CalendarGrid month={{ year: 2026, month: 8 }} selected="2026-08-01" markers={{}} onSelectDay={onSelectDay} />,
    );
    await fireEvent.press(screen.getByText('13'));
    expect(onSelectDay).toHaveBeenCalledWith('2026-08-13');
  });

  // Regresión de la auditoría de accesibilidad: el label decía "{día} de
  // {mes}" con el mes en número (ej. "13 de 8"), sin nombre de mes ni qué
  // tenía ese día (los puntos de ingreso/gasto/programado se veían, pero no
  // se anunciaban).
  it('el label del día usa el mes en palabras y anuncia sus marcadores', async () => {
    await render(
      <CalendarGrid
        month={{ year: 2026, month: 8 }}
        selected="2026-08-01"
        markers={{ '2026-08-13': { income: false, expense: true, scheduled: false } }}
        onSelectDay={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('13 de agosto de 2026, con gastos')).toBeTruthy();
  });
});
