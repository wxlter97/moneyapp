import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import BalancesScreen from '@/app/(app)/balances';
import type { Person, PersonBalance, Workspace } from '@/api/types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

const mockBalancesQuery = jest.fn();
const mockPeopleQuery = jest.fn();
const mockCreatePerson = jest.fn();
const mockSettleBalance = jest.fn();
const mockDeletePerson = jest.fn();

jest.mock('@/api/queries', () => ({
  usePersonBalances: () => mockBalancesQuery(),
  usePeople: () => mockPeopleQuery(),
  useCreatePerson: () => ({ mutateAsync: mockCreatePerson, isPending: false }),
  useSettleBalance: () => ({ mutateAsync: mockSettleBalance, isPending: false }),
  useDeletePerson: () => ({ mutateAsync: mockDeletePerson, isPending: false }),
}));

const mockWorkspaces: Workspace[] = [
  { id: 'w1', name: 'Casa', base_currency: 'USD' } as Workspace,
];
jest.mock('@/store/workspace', () => ({
  useWorkspaceStore: (selector: (s: unknown) => unknown) =>
    selector({ workspaces: mockWorkspaces, activeId: 'w1' }),
}));

const ME_PERSON: Person = { id: 'me', name: 'Alice', member: 'mem1', is_me: true, created_at: '' };
const BETO: Person = { id: 'p-beto', name: 'Beto', member: null, is_me: false, created_at: '' };

const BALANCE: PersonBalance = { from_person: BETO, to_person: ME_PERSON, amount: '22.00' };

describe('BalancesScreen', () => {
  beforeEach(() => {
    mockSettleBalance.mockReset().mockResolvedValue([]);
    mockDeletePerson.mockReset().mockResolvedValue(undefined);
  });

  // HALLAZGO (reportado por el usuario): la pantalla "Personas" sólo dejaba
  // ver saldos y gente, sin ninguna acción -- ni saldar una deuda ni borrar
  // a alguien, aunque el backend ya tenía `settle-share`/`settle-balance` y
  // el borrado de `Person` armados.
  it('"Marcar como saldado" pide confirmación y llama a settleBalance con el par correcto', async () => {
    mockBalancesQuery.mockReturnValue({ data: [BALANCE], isLoading: false, isError: false });
    mockPeopleQuery.mockReturnValue({ data: [ME_PERSON, BETO], isLoading: false });
    await render(<BalancesScreen />);

    await fireEvent.press(screen.getByText('Marcar como saldado'));
    expect(screen.getByText(/¿Marcar como saldado\?/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Ya saldamos' }));
    await waitFor(() =>
      expect(mockSettleBalance).toHaveBeenCalledWith({ fromPersonId: 'p-beto', toPersonId: 'me' }),
    );
  });

  it('borrar una persona pide confirmación y llama a deletePerson', async () => {
    mockBalancesQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    mockPeopleQuery.mockReturnValue({ data: [ME_PERSON, BETO], isLoading: false });
    await render(<BalancesScreen />);

    await fireEvent.press(screen.getByLabelText('Borrar a Beto'));
    expect(screen.getByText(/¿Borrar a «Beto»\?/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(mockDeletePerson).toHaveBeenCalledWith('p-beto'));
  });

  it('si el backend rechaza el borrado (tiene transacciones asociadas), muestra el motivo', async () => {
    mockBalancesQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    mockPeopleQuery.mockReturnValue({ data: [ME_PERSON, BETO], isLoading: false });
    mockDeletePerson.mockRejectedValue({
      isAxiosError: true,
      // DRF serializa un `ValidationError("...")` de una vista (no de un
      // serializer) como una lista plana, no como `{detail: "..."}`.
      response: { data: ['Esta persona tiene transacciones divididas asociadas; no se puede borrar.'] },
    });
    await render(<BalancesScreen />);

    await fireEvent.press(screen.getByLabelText('Borrar a Beto'));
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar' }));

    expect(
      await screen.findByText('Esta persona tiene transacciones divididas asociadas; no se puede borrar.'),
    ).toBeTruthy();
  });
});
