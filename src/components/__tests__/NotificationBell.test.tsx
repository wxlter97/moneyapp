import { fireEvent, render, screen } from '@testing-library/react-native';

import { NotificationBell } from '@/components/NotificationBell';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const mockUnreadCount = jest.fn();
jest.mock('@/api/queries', () => ({
  useUnreadNotificationCount: () => mockUnreadCount(),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('sin notificaciones sin leer, no muestra badge', async () => {
    mockUnreadCount.mockReturnValue({ data: 0 });
    await render(<NotificationBell />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('con notificaciones sin leer, muestra el número', async () => {
    mockUnreadCount.mockReturnValue({ data: 3 });
    await render(<NotificationBell />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('con más de 99, muestra "99+"', async () => {
    mockUnreadCount.mockReturnValue({ data: 140 });
    await render(<NotificationBell />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('tocarla navega al centro de notificaciones', async () => {
    mockUnreadCount.mockReturnValue({ data: 2 });
    await render(<NotificationBell />);
    await fireEvent.press(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/notification-center');
  });
});
