import { fireEvent, render, screen } from '@testing-library/react-native';

import { SpendingByCategoryCard } from '@/components/SpendingByCategoryCard';
import type { Category } from '@/api/types';

const mockPush = jest.fn();

const cat = (id: string, name: string): Category =>
  ({ id, name, icon: '', color: '#111', type: 'expense', parent: 'g', is_group: false }) as Category;

const mockCats = new Map([
  ['c1', cat('c1', 'Supermercado')],
  ['c2', cat('c2', 'Restaurantes')],
]);

jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('@/store/workspace', () => ({
  useWorkspaceStore: (sel: (s: unknown) => unknown) =>
    sel({ activeId: 'w1', workspaces: [{ id: 'w1', budget_period: 'monthly', week_start_day: 0 }] }),
}));
jest.mock('@/api/queries/lookups', () => ({ useCategoryMap: () => ({ map: mockCats }) }));
jest.mock('@/api/queries', () => ({
  useTransactionBreakdown: () => ({
    isLoading: false,
    data: {
      count: 2,
      categories: [
        { category: 'c1', currency: 'USD', income: '0', expenses: '300.00', count: 2 },
        { category: 'c2', currency: 'USD', income: '0', expenses: '100.00', count: 1 },
      ],
    },
  }),
}));

describe('SpendingByCategoryCard', () => {
  beforeEach(() => mockPush.mockReset());

  it('lista las categorías con su porcentaje', async () => {
    await render(<SpendingByCategoryCard currency="USD" />);
    expect(screen.getByText('Total gastado')).toBeTruthy();
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('tocar una fila la resalta en el centro y tocarla otra vez abre sus movimientos', async () => {
    await render(<SpendingByCategoryCard currency="USD" />);
    await fireEvent.press(screen.getByLabelText('Restaurantes, 25%'));
    expect(screen.queryByText('Total gastado')).toBeNull();
    expect(screen.getByText('Ver movimientos')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Restaurantes, 25%'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toContain('/category-transactions?category=c2&from=');
  });
});
