import { openingBalanceFor } from '@/lib/statementImport';

const card = (closing: string | null) =>
  ({ purpose: 'debt', closing_balance: closing }) as Parameters<typeof openingBalanceFor>[0];
const account = (closing: string | null) =>
  ({ purpose: 'spending', closing_balance: closing }) as Parameters<typeof openingBalanceFor>[0];

// El saldo inicial se calcula para que, después de importar los movimientos
// elegidos, el saldo de la cartera nueva coincida con el del estado de cuenta.
describe('openingBalanceFor', () => {
  it('tarjeta sin movimientos: el saldo inicial es la deuda en negativo', () => {
    expect(openingBalanceFor(card('1250.40'), [])).toBe(-1250.4);
  });

  it('tarjeta: compras suben la deuda y pagos la bajan, el final cuadra con el corte', () => {
    const sel = [
      { type: 'expense' as const, amount: '45.10' },
      { type: 'income' as const, amount: '200.00' },
    ];
    const opening = openingBalanceFor(card('1250.40'), sel);
    // saldo final = inicial + ingresos - gastos = -1250.40
    expect(Math.round((opening + 200 - 45.1) * 100) / 100).toBe(-1250.4);
  });

  it('cuenta: el final es el saldo del estado', () => {
    const sel = [
      { type: 'expense' as const, amount: '30.00' },
      { type: 'income' as const, amount: '100.00' },
    ];
    const opening = openingBalanceFor(account('500.00'), sel);
    expect(Math.round((opening + 100 - 30) * 100) / 100).toBe(500);
  });

  it('sin saldo leído parte de cero', () => {
    expect(openingBalanceFor(card(null), [{ type: 'expense', amount: '10.00' }])).toBe(0);
  });
});
