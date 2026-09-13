import { fireEvent, render, screen } from '@testing-library/react-native';

import NotificationCenterScreen from '@/app/(app)/notification-center';
import type { AppNotification } from '@/api/types';
import { useWorkspaceStore } from '@/store/workspace';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn(), canGoBack: () => false },
}));

const mockNotificationsQuery = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();

jest.mock('@/api/queries', () => ({
  useNotifications: () => mockNotificationsQuery(),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutateAsync: mockMarkAllRead, isPending: false }),
}));

function n(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: 'n-1',
    kind: 'invitation',
    title: 'Te invitaron a un presupuesto',
    body: 'Te invitaron a "Casa"',
    data: { type: 'invitation' },
    status: 'unread',
    workspace: 'ws-1',
    created_at: '2026-01-01T12:00:00Z',
    ...overrides,
  };
}

describe('NotificationCenterScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockMarkRead.mockReset();
    mockMarkAllRead.mockReset().mockResolvedValue({ updated: 1 });
    useWorkspaceStore.setState({ workspaces: [], activeId: null });
  });

  it('muestra estado vacío sin notificaciones', async () => {
    mockNotificationsQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    await render(<NotificationCenterScreen />);
    expect(screen.getByText('Sin notificaciones')).toBeTruthy();
  });

  it('lista las notificaciones', async () => {
    mockNotificationsQuery.mockReturnValue({
      data: [n({ id: 'a', title: 'Uno' }), n({ id: 'b', title: 'Dos', status: 'read' })],
      isLoading: false,
      isError: false,
    });
    await render(<NotificationCenterScreen />);
    expect(screen.getByText('Uno')).toBeTruthy();
    expect(screen.getByText('Dos')).toBeTruthy();
  });

  it('sin ninguna sin leer, no ofrece "Marcar todas leídas"', async () => {
    mockNotificationsQuery.mockReturnValue({
      data: [n({ status: 'read' })],
      isLoading: false,
      isError: false,
    });
    await render(<NotificationCenterScreen />);
    expect(screen.queryByText('Marcar todas leídas')).toBeNull();
  });

  it('tocar una no leída la marca leída, cambia el workspace activo y navega según su tipo', async () => {
    mockNotificationsQuery.mockReturnValue({
      data: [n({ id: 'a', kind: 'email_import_pending', data: { type: 'email_import_pending', workspace: 'ws-2' } })],
      isLoading: false,
      isError: false,
    });
    await render(<NotificationCenterScreen />);

    await fireEvent.press(screen.getByText('Te invitaron a un presupuesto'));

    expect(mockMarkRead).toHaveBeenCalledWith('a');
    expect(useWorkspaceStore.getState().activeId).toBe('ws-2');
    expect(mockPush).toHaveBeenCalledWith('/imports');
  });

  it('tocar una ya leída no la vuelve a marcar', async () => {
    mockNotificationsQuery.mockReturnValue({
      data: [n({ id: 'a', status: 'read' })],
      isLoading: false,
      isError: false,
    });
    await render(<NotificationCenterScreen />);

    await fireEvent.press(screen.getByText('Te invitaron a un presupuesto'));
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('"Marcar todas leídas" llama a la mutación', async () => {
    mockNotificationsQuery.mockReturnValue({
      data: [n({})],
      isLoading: false,
      isError: false,
    });
    await render(<NotificationCenterScreen />);

    await fireEvent.press(screen.getByText('Marcar todas leídas'));
    expect(mockMarkAllRead).toHaveBeenCalled();
  });
});
