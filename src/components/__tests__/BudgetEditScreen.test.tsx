import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import BudgetEdit from '@/app/(app)/budget-edit';
import type { Category } from '@/api/types';

const mockSetForward = jest.fn();

const cat = (over: Partial<Category>): Category =>
  ({ icon: '', color: '#111', type: 'expense', sort_order: 0, usage_count: 0, ...over }) as Category;

const mockCategories: Category[] = [
  cat({ id: 'g-con', name: 'Vivienda', parent: null, is_group: true }),
  cat({ id: 'c-renta', name: 'Renta', parent: 'g-con' }),
  cat({ id: 'g-sin', name: 'Mascotas', parent: null, is_group: true }),
];

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), router: { push: jest.fn() } }));
jest.mock('@/components/ui/ModalHeader', () => ({ ModalHeader: () => null, dismissModal: jest.fn() }));
jest.mock('@/components/ui/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/store/workspace', () => ({
  useWorkspaceStore: (sel: (s: unknown) => unknown) =>
    sel({
      activeId: 'w1',
      workspaces: [{ id: 'w1', role: 'member', budget_period: 'monthly', week_start_day: 0, rollover_surplus: true }],
    }),
}));
jest.mock('@/api/queries', () => ({
  useCategories: () => ({ data: mockCategories, isLoading: false }),
  useCategoryBudgets: () => ({ data: [], isLoading: false }),
  useBudgetReport: () => ({ data: { groups: [] } }),
  useSetForwardCategoryBudget: () => ({ mutateAsync: mockSetForward, isPending: false }),
  useDeleteCategoryBudget: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useResetProvisions: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetBudgetPeriod: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetWeekStartDay: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetRolloverSurplus: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

describe('budget-edit: grupos sin subcategorías', () => {
  beforeEach(() => mockSetForward.mockReset().mockResolvedValue({}));

  it('un grupo con subcategorías es de solo lectura; uno sin ellas se puede presupuestar', async () => {
    await render(<BudgetEdit />);
    // Sólo el grupo sin hijas ("Mascotas") tiene un campo de monto editable.
    expect(screen.getAllByPlaceholderText('0.00')).toHaveLength(1);
  });

  it('guarda el presupuesto del grupo sin subcategorías como categoría propia', async () => {
    await render(<BudgetEdit />);
    await fireEvent.changeText(screen.getByPlaceholderText('0.00'), '40');
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(mockSetForward).toHaveBeenCalledTimes(1));
    expect(mockSetForward.mock.calls[0][0]).toMatchObject({ category: 'g-sin', amount: '40.00' });
  });
});
