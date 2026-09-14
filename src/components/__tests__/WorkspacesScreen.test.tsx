import { fireEvent, render, screen } from '@testing-library/react-native';

import WorkspacesScreen from '@/app/(app)/workspaces';
import type { Workspace } from '@/api/types';
import { useWorkspaceStore } from '@/store/workspace';

// `ModalHeader`/`Screen` importan `expo-router` para el gesto de "volver" --
// mismo motivo que en TwoFactorScreen.test.tsx.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

const mockCreate = jest.fn();
const mockRename = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/api/queries', () => ({
  useCreateWorkspace: () => ({ mutateAsync: mockCreate, isPending: false }),
  useRenameWorkspace: () => ({ mutateAsync: mockRename, isPending: false }),
  useDeleteWorkspace: () => ({ mutateAsync: mockDelete, isPending: false }),
}));

function ws(overrides: Partial<Workspace>): Workspace {
  return {
    id: 'ws-1',
    name: 'Casa',
    role: 'owner',
    member_count: 1,
    base_currency: 'USD',
    inbound_token: 'tok',
    inbound_email: 'import+tok@example.com',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('WorkspacesScreen', () => {
  beforeEach(() => {
    mockCreate.mockReset().mockResolvedValue(undefined);
    mockRename.mockReset().mockResolvedValue(undefined);
    mockDelete.mockReset().mockResolvedValue(undefined);
  });

  it('lista los presupuestos y marca el activo', async () => {
    const casa = ws({ id: 'ws-1', name: 'Casa' });
    const viaje = ws({ id: 'ws-2', name: 'Viaje', member_count: 2 });
    useWorkspaceStore.setState({ workspaces: [casa, viaje], activeId: 'ws-1' });

    await render(<WorkspacesScreen />);
    expect(screen.getByText('Casa')).toBeTruthy();
    expect(screen.getByText('Viaje')).toBeTruthy();
  });

  it('tocar un presupuesto inactivo lo hace el activo', async () => {
    const casa = ws({ id: 'ws-1', name: 'Casa' });
    const viaje = ws({ id: 'ws-2', name: 'Viaje' });
    useWorkspaceStore.setState({ workspaces: [casa, viaje], activeId: 'ws-1' });

    await render(<WorkspacesScreen />);
    await fireEvent.press(screen.getByText('Viaje'));

    expect(useWorkspaceStore.getState().activeId).toBe('ws-2');
  });

  it('renombrar edita el nombre y llama a la mutación', async () => {
    const casa = ws({ id: 'ws-1', name: 'Casa' });
    useWorkspaceStore.setState({ workspaces: [casa], activeId: 'ws-1' });

    await render(<WorkspacesScreen />);
    await fireEvent.press(screen.getByText('Renombrar'));

    const input = screen.getByLabelText('Nombre');
    await fireEvent.changeText(input, 'Casa nueva');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(mockRename).toHaveBeenCalledWith({ id: 'ws-1', name: 'Casa nueva' });
  });

  it('con un único presupuesto, "Borrar" está deshabilitado', async () => {
    const casa = ws({ id: 'ws-1', name: 'Casa' });
    useWorkspaceStore.setState({ workspaces: [casa], activeId: 'ws-1' });

    await render(<WorkspacesScreen />);
    const deleteButton = screen.getByRole('button', { name: 'Borrar' });
    await fireEvent.press(deleteButton);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(/¿Borrar Casa\?/)).toBeNull();
  });

  it('con más de uno, confirmar borrado llama a la mutación', async () => {
    const casa = ws({ id: 'ws-1', name: 'Casa' });
    const viaje = ws({ id: 'ws-2', name: 'Viaje' });
    useWorkspaceStore.setState({ workspaces: [casa, viaje], activeId: 'ws-1' });

    await render(<WorkspacesScreen />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Borrar' });
    await fireEvent.press(deleteButtons[0]);

    // Ahora hay dos "Borrar": el de confirmación (Casa) y el de la fila de
    // Viaje (todavía sin tocar) -- el de confirmación queda primero en el árbol.
    const confirmButtons = screen.getAllByRole('button', { name: 'Borrar' });
    await fireEvent.press(confirmButtons[0]);
    expect(mockDelete).toHaveBeenCalledWith('ws-1');
  });

  it('crear un presupuesto nuevo llama a la mutación con el nombre escrito', async () => {
    const casa = ws({ id: 'ws-1', name: 'Casa' });
    useWorkspaceStore.setState({ workspaces: [casa], activeId: 'ws-1' });

    await render(<WorkspacesScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Casa, Viaje, Negocio...'), 'Negocio');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear' }));

    expect(mockCreate).toHaveBeenCalledWith('Negocio');
  });
});
