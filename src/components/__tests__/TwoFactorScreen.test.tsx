import { fireEvent, render, screen } from '@testing-library/react-native';

import TwoFactorScreen from '@/app/(app)/two-factor';

// `ModalHeader`/`Screen` (usados por esta pantalla) importan `expo-router`
// para el gesto de "volver" -- el paquete real tira de `standard-navigation`,
// que no está en el transformIgnorePatterns de jest y no compila bajo test.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

const mockStatus = jest.fn();
const mockSetup = jest.fn();
const mockEnable = jest.fn();
const mockDisable = jest.fn();
const mockRegenerateBackupCodes = jest.fn();

jest.mock('@/api/auth', () => ({
  twoFactor: {
    status: (...args: unknown[]) => mockStatus(...args),
    setup: (...args: unknown[]) => mockSetup(...args),
    enable: (...args: unknown[]) => mockEnable(...args),
    disable: (...args: unknown[]) => mockDisable(...args),
    regenerateBackupCodes: (...args: unknown[]) => mockRegenerateBackupCodes(...args),
  },
}));

describe('TwoFactorScreen', () => {
  beforeEach(() => {
    mockStatus.mockReset();
    mockSetup.mockReset();
    mockEnable.mockReset();
    mockDisable.mockReset();
    mockRegenerateBackupCodes.mockReset();
  });

  it('sin 2FA activo, ofrece "Activar"', async () => {
    mockStatus.mockResolvedValue({ enabled: false });
    await render(<TwoFactorScreen />);
    expect(await screen.findByText('Activar')).toBeTruthy();
  });

  it('con 2FA ya activo, muestra "Activa" y las acciones de gestión', async () => {
    mockStatus.mockResolvedValue({ enabled: true });
    await render(<TwoFactorScreen />);
    expect(await screen.findByText('Activa')).toBeTruthy();
    expect(screen.getByText('Generar nuevos códigos de respaldo')).toBeTruthy();
    expect(screen.getByText('Desactivar')).toBeTruthy();
  });

  it('flujo completo: activar -> confirmar código -> ver códigos de respaldo -> queda "Activa"', async () => {
    mockStatus.mockResolvedValue({ enabled: false });
    mockSetup.mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/x' });
    mockEnable.mockResolvedValue({ enabled: true, backup_codes: ['AAAA-1111', 'BBBB-2222'] });

    await render(<TwoFactorScreen />);
    await fireEvent.press(await screen.findByText('Activar'));

    // Paso "setup": muestra el secreto (como botón para copiarlo) y pide el código.
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Código'), '123456');
    await fireEvent.press(screen.getByText('Confirmar'));

    expect(mockEnable).toHaveBeenCalledWith('123456');
    expect(await screen.findByText('AAAA-1111')).toBeTruthy();
    expect(screen.getByText('BBBB-2222')).toBeTruthy();

    await fireEvent.press(screen.getByText('Ya los guardé'));
    expect(await screen.findByText('Activa')).toBeTruthy();
  });

  it('desactivar pide contraseña y, si es incorrecta, muestra el error sin salir del paso', async () => {
    mockStatus.mockResolvedValue({ enabled: true });
    mockDisable.mockRejectedValue({
      response: { data: { detail: 'Contraseña incorrecta.' } },
    });

    await render(<TwoFactorScreen />);
    await fireEvent.press(await screen.findByText('Desactivar'));
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala-clave');
    await fireEvent.press(screen.getByText('Desactivar'));

    expect(mockDisable).toHaveBeenCalledWith('mala-clave');
    expect(await screen.findByText('Contraseña incorrecta.')).toBeTruthy();
    // Sigue pidiendo la contraseña -- no volvió a "Activa".
    expect(screen.queryByText('Activa')).toBeNull();
  });

  it('desactivar con contraseña correcta vuelve al estado "sin 2FA"', async () => {
    mockStatus.mockResolvedValue({ enabled: true });
    mockDisable.mockResolvedValue(undefined);

    await render(<TwoFactorScreen />);
    await fireEvent.press(await screen.findByText('Desactivar'));
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'clave-correcta');
    await fireEvent.press(screen.getByText('Desactivar'));

    expect(await screen.findByText('Activar')).toBeTruthy();
  });
});
