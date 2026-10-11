import { fireEvent, render } from '@testing-library/react-native';

import { DateField } from '@/components/ui/DateField';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const offset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmt(d);
};

describe('DateField', () => {
  it('muestra Hoy / Ayer para fechas cercanas', async () => {
    const view = await render(<DateField label="Fecha" value={offset(0)} onChange={jest.fn()} />);
    expect(view.getByText(/Hoy/)).toBeTruthy();
    await view.rerender(<DateField label="Fecha" value={offset(-1)} onChange={jest.fn()} />);
    expect(view.getByText(/Ayer/)).toBeTruthy();
  });

  it('las flechas cambian de día de uno en uno', async () => {
    const onChange = jest.fn();
    const view = await render(<DateField label="Fecha" value={offset(0)} onChange={onChange} quickStep />);
    await fireEvent.press(view.getByLabelText('Día anterior'));
    expect(onChange).toHaveBeenLastCalledWith(offset(-1));
    await fireEvent.press(view.getByLabelText('Día siguiente'));
    expect(onChange).toHaveBeenLastCalledWith(offset(1));
  });

  it('respeta maxToday', async () => {
    const onChange = jest.fn();
    const view = await render(<DateField label="Fecha" value={offset(0)} onChange={onChange} quickStep maxToday />);
    await fireEvent.press(view.getByLabelText('Día siguiente'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
