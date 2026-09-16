import { render, screen } from '@testing-library/react-native';

import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import type { Workspace } from '@/api/types';

const mockSetActiveId = jest.fn();
const mockWorkspaces: Workspace[] = [
  { id: 'w1', name: 'porksupuesto', role: 'owner', member_count: 1 } as Workspace,
  { id: 'w2', name: 'Trabajo', role: 'owner', member_count: 1 } as Workspace,
];

jest.mock('@/store/workspace', () => ({
  useWorkspaceStore: (selector: (s: unknown) => unknown) =>
    selector({ workspaces: mockWorkspaces, activeId: 'w1', setActiveId: mockSetActiveId }),
}));

jest.mock('@/api/queries', () => ({
  useCreateWorkspace: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// Regresión de la auditoría de accesibilidad: el botón "porksupuesto ⌄" no
// tenía `accessibilityLabel` -- un lector de pantalla lo anunciaba como un
// botón sin texto, sin forma de saber que es el selector de workspace/presupuesto.
describe('WorkspaceSwitcher', () => {
  it('el botón tiene un accessibilityLabel que nombra la acción y el workspace activo', async () => {
    await render(<WorkspaceSwitcher />);
    const button = screen.getByLabelText('Cambiar de presupuesto, actual: porksupuesto');
    expect(button).toBeTruthy();
  });
});
