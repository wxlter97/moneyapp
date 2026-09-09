import { render, screen } from '@testing-library/react-native';

import type { NetWorthBreakdown } from '@/api/types';
import { NetWorthPager } from '@/components/NetWorthPager';
import { formatSigned } from '@/lib/money';

// `useWindowDimensions` no depende de nada que el entorno de test no tenga,
// pero fijamos un ancho conocido igual (no hace falta mockearlo).

const breakdown: NetWorthBreakdown = {
  net: '900.00',
  by_purpose: {
    spending: '500.00',
    savings: '300.00',
    debt: '-200.00',
    asset: '300.00',
  },
  base_currency: 'USD',
};

describe('NetWorthPager', () => {
  it('la página "neto" muestra data.net tal cual viene', async () => {
    await render(<NetWorthPager data={breakdown} currency="USD" />);
    expect(screen.getByText('Valor neto total')).toBeTruthy();
    // En este fixture "neto" y "bruto" coinciden ($900) -- el valor en sí se
    // confirma acá, la distinción entre ambas páginas la prueba el test de
    // abajo con un fixture donde difieren.
    expect(screen.getAllByText(formatSigned(900, 'USD')).length).toBeGreaterThanOrEqual(1);
  });

  it('la página "bruto" suma los 4 by_purpose, sin restar nada', async () => {
    await render(<NetWorthPager data={breakdown} currency="USD" />);
    expect(screen.getByText('Todas las carteras (bruto)')).toBeTruthy();
    // 500 + 300 + (-200) + 300 = 900 -- en este fixture coincide con el
    // neto, así que probamos también un caso donde difieren (ver test de
    // abajo) para no dejar pasar un bug donde "bruto" fuera un alias de "net".
    expect(screen.getAllByText(formatSigned(900, 'USD')).length).toBeGreaterThanOrEqual(2);
  });

  it('"bruto" y "neto" difieren cuando hay carteras fuera del patrimonio neto', async () => {
    // `by_purpose` no filtra por `counts_toward_net_worth` (ver comentario en
    // NetWorthPager.tsx) -- si una cartera queda afuera del neto, `net` baja
    // pero el bruto la sigue incluyendo.
    const withExcluded: NetWorthBreakdown = {
      ...breakdown,
      net: '650.00', // una cartera de $250 en "asset" quedó afuera del neto
    };
    await render(<NetWorthPager data={withExcluded} currency="USD" />);
    expect(screen.getByText(formatSigned(650, 'USD'))).toBeTruthy();
    expect(screen.getByText(formatSigned(900, 'USD'))).toBeTruthy();
  });

  it('agrega una página por cada tipo de cartera con saldo distinto de cero', async () => {
    await render(<NetWorthPager data={breakdown} currency="USD" />);
    expect(screen.getByText('Carteras de gasto')).toBeTruthy();
    expect(screen.getByText('Carteras de ahorro')).toBeTruthy();
    expect(screen.getByText('Carteras de deuda')).toBeTruthy();
    expect(screen.getByText('Carteras de activo')).toBeTruthy();
  });

  it('omite la página de un tipo de cartera con saldo en cero', async () => {
    const noDebt: NetWorthBreakdown = {
      ...breakdown,
      by_purpose: { ...breakdown.by_purpose, debt: '0.00' },
    };
    await render(<NetWorthPager data={noDebt} currency="USD" />);
    expect(screen.queryByText('Carteras de deuda')).toBeNull();
  });
});
