import { render, screen, fireEvent } from '@testing-library/react-native';

import { Segmented } from '@/components/ui/Segmented';

const OPTIONS = [
  { value: 'all' as const, label: 'Todas' },
  { value: 'net' as const, label: 'Cuentan al neto' },
  { value: 'excluded' as const, label: 'Fuera del neto' },
];

describe('Segmented', () => {
  it('renderiza cada opción', async () => {
    await render(<Segmented value="all" onChange={jest.fn()} options={OPTIONS} />);
    expect(screen.getByText('Todas')).toBeTruthy();
    expect(screen.getByText('Cuentan al neto')).toBeTruthy();
    expect(screen.getByText('Fuera del neto')).toBeTruthy();
  });

  it('llama a onChange con el value de la opción tocada', async () => {
    const onChange = jest.fn();
    await render(<Segmented value="all" onChange={onChange} options={OPTIONS} />);
    await fireEvent.press(screen.getByText('Cuentan al neto'));
    expect(onChange).toHaveBeenCalledWith('net');
  });

  it('marca como seleccionada la opción que coincide con value', async () => {
    await render(<Segmented value="net" onChange={jest.fn()} options={OPTIONS} />);
    const active = screen.getByText('Cuentan al neto');
    // El texto activo lleva font-semibold + color primary-fg (ver Segmented.tsx).
    expect(active.props.className).toContain('text-primary-fg');
    const inactive = screen.getByText('Todas');
    expect(inactive.props.className).toContain('text-text-muted');
  });

  it('un value que no matchea ninguna opción no rompe el render', async () => {
    // Segmented usa `Math.max(0, findIndex(...))` -- un value inexistente
    // cae al primer segmento en vez de reventar.
    await render(<Segmented value={'nope' as never} onChange={jest.fn()} options={OPTIONS} />);
    expect(screen.getByText('Todas')).toBeTruthy();
  });
});
