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
    [{ type: 'statement_closed', wallet: 'w1' }, '/statement/w1'],
    [{ type: 'subscription_expired' }, '/pro'],
    [{ type: 'insight' }, '/dashboard'],
    [{ type: 'monthly_summary', month: '2026-03' }, '/dashboard?month=2026-03'],
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

  it('vencido con mínimo: ofrece pagar el total y el mínimo', () => {
    const actions = actionsForNotification({
      type: 'statement_overdue',
      wallet: 'w1',
      amount: '200.00',
      minimum: '25.00',
    });
    expect(actions.map((a) => a.label)).toEqual(['Registrar pago', 'Pagar el mínimo', 'Ver estado de cuenta']);
  });

  it('recurrente: registrar ahora primero', () => {
    expect(actionsForNotification({ type: 'recurring_due', source_id: 'r1' })[0]).toMatchObject({
      kind: 'record-recurring',
      recurringId: 'r1',
    });
  });

  it('resumen mensual: abre el mes que cerró, no el actual', () => {
    const [first, second] = actionsForNotification({ type: 'monthly_summary', month: '2026-03' });
    expect(first).toMatchObject({ kind: 'route', href: '/dashboard?month=2026-03' });
    expect(second).toMatchObject({ kind: 'route', href: '/budgets' });
  });

  it('resumen mensual viejo (sin month): usa el mes anterior al de la notificación', () => {
    const [first] = actionsForNotification({ type: 'monthly_summary' }, '2026-04-01T12:00:00');
    expect(first).toMatchObject({ href: '/dashboard?month=2026-03' });
    const [jan] = actionsForNotification({ type: 'monthly_summary' }, '2026-01-01T12:00:00');
    expect(jan).toMatchObject({ href: '/dashboard?month=2025-12' });
  });

  it('nunca vacía', () => {
    expect(actionsForNotification({})).toHaveLength(1);
    expect(actionsForNotification({ type: 'low_balance' })).toHaveLength(1);
  });
});
