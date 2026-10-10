import { fireEvent, render, screen } from '@testing-library/react-native';

import { WalletColorPicker } from '@/components/WalletColorPicker';
import { WALLET_COLOR_OPTIONS } from '@/lib/wallets';

describe('WalletColorPicker', () => {
  it('muestra el nombre de cada color y del elegido', async () => {
    await render(<WalletColorPicker value="#3B82F6" onChange={jest.fn()} />);
    expect(screen.getAllByText('Azul').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Color elegido: Azul')).toBeTruthy();
    expect(screen.getByText('Personalizado')).toBeTruthy();
    expect(WALLET_COLOR_OPTIONS.length).toBeGreaterThanOrEqual(16);
  });

  it('elige un color y, al tocarlo de nuevo, lo quita', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<WalletColorPicker value="" onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Color Rojo'));
    expect(onChange).toHaveBeenLastCalledWith('#EF4444');

    await rerender(<WalletColorPicker value="#EF4444" onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Color Rojo'));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('un color fuera de la paleta se muestra como personalizado', async () => {
    await render(<WalletColorPicker value="#123456" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Color elegido: Personalizado #123456')).toBeTruthy();
  });
});
