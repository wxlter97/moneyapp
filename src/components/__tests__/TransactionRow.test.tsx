import { render, screen } from '@testing-library/react-native';

import type { Category, Transaction, Wallet } from '@/api/types';
import { TransactionRow } from '@/components/TransactionRow';
import { formatMoney, formatParens } from '@/lib/money';

// Sólo para poder distinguir QUÉ ícono se eligió (`Icon` de por sí renderiza
// paths de SVG, sin ningún rastro del nombre en el árbol) -- no cambia nada
// de lo que ya prueban el resto de los tests de este archivo (sólo texto).
// `require` adentro del factory (no un `import` de arriba) porque
// `jest.mock` se hoistea por encima de los imports del módulo.
jest.mock('@/components/ui/Icon', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentario de arriba
  const mockReactNative = require('react-native');
  return {
    Icon: ({ name }: { name: string }) => <mockReactNative.Text>{`icon:${name}`}</mockReactNative.Text>,
  };
});

const wallet = (id: string, name: string): Wallet =>
  ({ id, name, currency: 'USD' }) as Wallet;

const category = (id: string, name: string): Category =>
  ({ id, name, icon: '', color: '' }) as Category;

const baseTxn: Transaction = {
  id: 't1',
  type: 'expense',
  wallet: 'a',
  to_wallet: null,
  category: 'c1',
  amount: '45.50',
  currency: 'USD',
  description: '',
  date: '2026-08-01',
  has_receipt: false,
  counts_toward_budget: true,
  source: 'manual',
  is_recurring: false,
  is_refundable: false,
  is_refunded: false,
  split_group: null,
  paid_by: null,
  paid_by_name: null,
  shares: [],
  tags: [],
  loyalty_earnings: [],
  created_by: null,
  created_at: '',
  updated_at: '',
} as unknown as Transaction;

const cuenta = wallet('a', 'Cuenta principal');
const ahorro = wallet('b', 'Ahorro');
const super_ = category('c1', 'Supermercado');

describe('TransactionRow', () => {
  it('gasto: título es la categoría, monto entre paréntesis (negativo)', async () => {
    await render(<TransactionRow txn={baseTxn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText(formatParens(-45.5, 'USD'))).toBeTruthy();
  });

  it('usa la descripción como título cuando la hay (no la categoría)', async () => {
    const txn = { ...baseTxn, description: 'Compra de la semana' };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('Compra de la semana')).toBeTruthy();
  });

  it('ingreso: monto sin paréntesis (positivo)', async () => {
    const sueldo = category('c2', 'Sueldo');
    const txn = { ...baseTxn, type: 'income' as const, amount: '1200.00' };
    await render(<TransactionRow txn={txn} category={sueldo} wallet={cuenta} />);
    expect(screen.getByText(formatParens(1200, 'USD'))).toBeTruthy();
  });

  it('transferencia: título fijo + "origen → destino", sin signo propio', async () => {
    const txn = {
      ...baseTxn, type: 'transfer' as const, to_wallet: 'b', category: null, amount: '200.00',
    };
    await render(<TransactionRow txn={txn} wallet={cuenta} toWallet={ahorro} />);
    expect(screen.getByText('Transferencia')).toBeTruthy();
    expect(screen.getByText('Cuenta principal → Ahorro')).toBeTruthy();
  });

  it('transferencia vista desde el origen: sale (negativo)', async () => {
    const txn = {
      ...baseTxn, type: 'transfer' as const, to_wallet: 'b', category: null, amount: '200.00',
    };
    await render(
      <TransactionRow txn={txn} wallet={cuenta} toWallet={ahorro} perspectiveWalletId="a" />,
    );
    expect(screen.getByText(formatParens(-200, 'USD'))).toBeTruthy();
  });

  it('transferencia vista desde el destino: entra (positivo)', async () => {
    const txn = {
      ...baseTxn, type: 'transfer' as const, to_wallet: 'b', category: null, amount: '200.00',
    };
    await render(
      <TransactionRow txn={txn} wallet={cuenta} toWallet={ahorro} perspectiveWalletId="b" />,
    );
    expect(screen.getByText(formatParens(200, 'USD'))).toBeTruthy();
  });

  it('muestra el saldo después, sólo cuando se lo pasan', async () => {
    const { rerender } = await render(<TransactionRow txn={baseTxn} category={super_} wallet={cuenta} />);
    expect(screen.queryByText(/^Saldo:/)).toBeNull();

    await rerender(
      <TransactionRow txn={baseTxn} category={super_} wallet={cuenta} balanceAfter={954.5} />,
    );
    expect(screen.getByText(`Saldo: ${formatMoney(954.5, 'USD')}`)).toBeTruthy();
  });

  it('gasto fuera de presupuesto muestra el badge "s/pres."', async () => {
    const txn = { ...baseTxn, counts_toward_budget: false };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('s/pres.')).toBeTruthy();
  });

  it('una transacción reembolsable (sin reembolsar) muestra el badge "reembolsable"', async () => {
    const txn = { ...baseTxn, is_refundable: true };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('reembolsable')).toBeTruthy();
  });

  it('una transacción ya reembolsada muestra el badge "reembolsado" en vez de "reembolsable"', async () => {
    const txn = { ...baseTxn, is_refundable: true, is_refunded: true };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('reembolsado')).toBeTruthy();
    expect(screen.queryByText('reembolsable')).toBeNull();
  });

  it('el badge de reembolso tiene prioridad sobre "s/pres."', async () => {
    const txn = { ...baseTxn, is_refundable: true, counts_toward_budget: false };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('reembolsable')).toBeTruthy();
    expect(screen.queryByText('s/pres.')).toBeNull();
  });

  it('una transacción dividida entre personas se renderiza sin errores', async () => {
    const txn = {
      ...baseTxn,
      shares: [{ id: 's1', person: 'p1', person_name: 'Beto', amount: '10.00', is_settled: false, settled_at: null }],
    };
    const { toJSON } = await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(toJSON()).toBeTruthy();
  });

  it('no explota si el backend todavía no manda `shares` (campo nuevo, backend viejo)', async () => {
    const { shares, ...txnWithoutShares } = baseTxn;
    const { toJSON } = await render(
      <TransactionRow txn={txnWithoutShares as Transaction} category={super_} wallet={cuenta} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  // HALLAZGO: dividir en categorías (`split_group`) y dividir entre personas
  // (`shares`) usaban el mismo ícono -- "no queda claro en la transacción
  // cómo funciona". Ahora cada uno tiene el suyo.
  it('dividida entre categorías y dividida entre personas usan íconos distintos', async () => {
    const porCategoria = { ...baseTxn, split_group: 'g1' };
    await render(<TransactionRow txn={porCategoria} category={super_} wallet={cuenta} />);
    expect(screen.getByText('icon:split')).toBeTruthy();
    expect(screen.queryByText('icon:users')).toBeNull();
  });

  it('dividida entre personas usa el ícono de "users", no el de "split"', async () => {
    const porPersonas = {
      ...baseTxn,
      shares: [{ id: 's1', person: 'p1', person_name: 'Beto', amount: '10.00', is_settled: false, settled_at: null }],
    };
    await render(<TransactionRow txn={porPersonas} category={super_} wallet={cuenta} />);
    expect(screen.getByText('icon:users')).toBeTruthy();
    expect(screen.queryByText('icon:split')).toBeNull();
  });

  it('una transacción importada por correo muestra el badge "correo"', async () => {
    const txn = { ...baseTxn, source: 'email_import' as const };
    await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} />);
    expect(screen.getByText('correo')).toBeTruthy();
  });

  it('una transacción manual no muestra ningún badge de origen', async () => {
    await render(<TransactionRow txn={baseTxn} category={super_} wallet={cuenta} />);
    expect(screen.queryByText('correo')).toBeNull();
    expect(screen.queryByText('cuota')).toBeNull();
    expect(screen.queryByText('atajo')).toBeNull();
  });

  // Regresión de la auditoría de accesibilidad: el botón principal de la
  // fila no tenía `accessibilityLabel` -- un lector de pantalla lo anunciaba
  // sin texto (solo el "Eliminar movimiento" anidado estaba etiquetado).
  describe('accessibilityLabel', () => {
    it('gasto: tipo, categoría/descripción, cartera y monto', async () => {
      await render(<TransactionRow txn={baseTxn} category={super_} wallet={cuenta} onPress={jest.fn()} />);
      expect(
        screen.getByLabelText(`Gasto, Supermercado, Cuenta principal, ${formatMoney(45.5, 'USD')}`),
      ).toBeTruthy();
    });

    it('transferencia: origen y destino, sin badge de origen', async () => {
      const txn = {
        ...baseTxn, type: 'transfer' as const, to_wallet: 'b', category: null, amount: '200.00',
      };
      await render(
        <TransactionRow txn={txn} wallet={cuenta} toWallet={ahorro} onPress={jest.fn()} />,
      );
      expect(
        screen.getByLabelText(`Transferencia, Cuenta principal a Ahorro, ${formatMoney(200, 'USD')}`),
      ).toBeTruthy();
    });

    it('gasto fuera de presupuesto agrega "fuera de presupuesto" al final', async () => {
      const txn = { ...baseTxn, counts_toward_budget: false };
      await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} onPress={jest.fn()} />);
      expect(
        screen.getByLabelText(
          `Gasto, Supermercado, Cuenta principal, ${formatMoney(45.5, 'USD')}, fuera de presupuesto`,
        ),
      ).toBeTruthy();
    });

    it('dividida entre personas agrega "dividida entre personas" al final', async () => {
      const txn = {
        ...baseTxn,
        shares: [{ id: 's1', person: 'p1', person_name: 'Beto', amount: '10.00', is_settled: false, settled_at: null }],
      };
      await render(<TransactionRow txn={txn} category={super_} wallet={cuenta} onPress={jest.fn()} />);
      expect(
        screen.getByLabelText(
          `Gasto, Supermercado, Cuenta principal, ${formatMoney(45.5, 'USD')}, dividida entre personas`,
        ),
      ).toBeTruthy();
    });

    it('sin onPress (fila no interactiva) no fuerza accessibilityLabel/role', async () => {
      await render(<TransactionRow txn={baseTxn} category={super_} wallet={cuenta} />);
      expect(screen.queryByLabelText(/Gasto, Supermercado/)).toBeNull();
    });
  });
});
