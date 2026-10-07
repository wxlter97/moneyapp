import { render, screen } from '@testing-library/react-native';

import type { Category } from '@/api/types';
import { CategoryGrid, CategoryPickerField } from '@/components/CategoryGrid';

const group = (id: string, name: string): Category =>
  ({ id, name, icon: '🏠', color: '#000', type: 'expense', parent: null, is_group: true }) as Category;

const sub = (id: string, name: string, parent: string): Category =>
  ({ id, name, icon: '', color: '#111', type: 'expense', parent, is_group: false }) as Category;

const vivienda = group('g1', 'Vivienda');
const alquiler = sub('c1', 'Alquiler', 'g1');

// Regresión de la auditoría de accesibilidad: los botones de esta rejilla
// (tile de categoría, encabezado de grupo, "+ Subcategoría", toggle del
// picker) no tenían `accessibilityLabel` -- algunos ni siquiera tenían
// `accessibilityRole="button"` (el encabezado de grupo).
describe('CategoryGrid — accesibilidad', () => {
  it('cada tile de categoría tiene accessibilityLabel con su nombre', async () => {
    await render(
      <CategoryGrid categories={[vivienda, alquiler]} type="expense" onSelect={jest.fn()} />,
    );
    expect(screen.getByLabelText('Alquiler')).toBeTruthy();
  });

  it('el encabezado de grupo es un botón etiquetado en modo gestión (onEditCategory)', async () => {
    await render(
      <CategoryGrid categories={[vivienda, alquiler]} type="expense" onEditCategory={jest.fn()} />,
    );
    const header = screen.getByLabelText('Editar categoría Vivienda');
    expect(header.props.accessibilityRole).toBe('button');
  });

  it('"+ Subcategoría" está etiquetado con el grupo al que pertenece', async () => {
    await render(
      <CategoryGrid
        categories={[vivienda, alquiler]}
        type="expense"
        onEditCategory={jest.fn()}
        onAddSub={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Agregar subcategoría a Vivienda')).toBeTruthy();
  });
});

describe('CategoryPickerField — accesibilidad', () => {
  it('el toggle anuncia la etiqueta y la categoría elegida', async () => {
    await render(
      <CategoryPickerField
        categories={[vivienda, alquiler]}
        type="expense"
        value="c1"
        open={false}
        onToggle={jest.fn()}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Categoría: Alquiler')).toBeTruthy();
  });

  it('sin selección anuncia "sin elegir"', async () => {
    await render(
      <CategoryPickerField
        categories={[vivienda, alquiler]}
        type="expense"
        value={null}
        open={false}
        onToggle={jest.fn()}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Categoría: sin elegir')).toBeTruthy();
  });
});

describe('CategoryGrid — más usadas primero', () => {
  const used = (c: Category, n: number): Category => ({ ...c, usage_count: n });
  const comida = group('g2', 'Comida');
  const cafe = used(sub('c2', 'Café', 'g2'), 40);
  const super_ = used(sub('c3', 'Súper', 'g2'), 10);
  const renta = used(alquiler, 25);

  it('muestra "Más usadas" arriba, ordenadas por uso descendente', async () => {
    await render(
      <CategoryGrid
        categories={[vivienda, renta, comida, super_, cafe]}
        type="expense"
        onSelect={jest.fn()}
        sortByUsage
      />,
    );
    expect(screen.getByText('Más usadas')).toBeTruthy();
    // Café (40) > Alquiler (25) > Súper (10), sin importar a qué grupo pertenecen.
    const labels = screen.getAllByLabelText(/^(Café|Alquiler|Súper)$/).map((n) => n.props.accessibilityLabel);
    expect(labels.slice(0, 3)).toEqual(['Café', 'Alquiler', 'Súper']);
  });

  it('sin uso previo no muestra la sección', async () => {
    await render(
      <CategoryGrid categories={[vivienda, alquiler]} type="expense" onSelect={jest.fn()} sortByUsage />,
    );
    expect(screen.queryByText('Más usadas')).toBeNull();
  });
});
