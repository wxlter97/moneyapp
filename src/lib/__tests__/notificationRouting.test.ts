import { actionsForNotification, routeForNotification } from '@/lib/notificationRouting';

describe('routeForNotification', () => {
  it.each([
    [{ type: 'budget_threshold' }, '/budgets'],
    [{ type: 'budget_threshold', category: 'c1' }, '/category-transactions?category=c1'],
    [{ type: 'invitation' }, '/invitations'],
    [{ type: 'email_import_pending' }, '/imports'],
    [{ type: 'email_import_pending', log_id: 'l1' }, '/import/l1'],
    [{ type: 'recurring_due', source_id: 'r1' }, '/recurring/r1'],
    [{ type: 'installment_due', source_id: 'i1' }, '/installment/i1'],
    [{ type: 'low_balance', wallet: 'w1' }, '/wallet-transactions?wallet=w1'],
    [{ type: 'statement_due', wallet: 'w1' }, '/statement/w1'],
    [{ type: 'subscription_expired' }, '/pro'],
    [{ type: 'insight' }, '/dashboard'],
  ])('%j -> %s', (data, expected) => {
    expect(routeForNotification(data)).toBe(expected);
  });

  it('sin type reconocido, cae a /dashboard', () => {
    expect(routeForNotification({})).toBe('/dashboard');
    expect(routeForNotification({ type: 'algo-nuevo' })).toBe('/dashboard');
  });
});

describe('actionsForNotification', () => {
  it('estado de cuenta: registrar el pago primero, con el monto del aviso', () => {
    const [first, second] = actionsForNotification({
      type: 'statement_due',
      wallet: 'w1',
      amount: '120.50',
    });
    expect(first).toMatchObject({ kind: 'transfer-to', walletId: 'w1', amount: '120.50' });
    expect(second).toMatchObject({ kind: 'route', href: '/statement/w1' });
  });

  it('recurrente: registrar ahora primero', () => {
    expect(actionsForNotification({ type: 'recurring_due', source_id: 'r1' })[0]).toMatchObject({
      kind: 'record-recurring',
      recurringId: 'r1',
    });
  });

  it('nunca vacía', () => {
    expect(actionsForNotification({})).toHaveLength(1);
    expect(actionsForNotification({ type: 'low_balance' })).toHaveLength(1);
  });
});
