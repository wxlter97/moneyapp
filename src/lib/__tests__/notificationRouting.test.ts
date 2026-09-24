import { routeForNotification } from '@/lib/notificationRouting';

describe('routeForNotification', () => {
  it.each([
    ['budget_threshold', '/budgets'],
    ['invitation', '/invitations'],
    ['email_import_pending', '/imports'],
    ['recurring_due', '/recurring'],
    ['installment_due', '/installments'],
    ['low_balance', '/wallets'],
    ['statement_due', '/statements'],
    ['statement_cutoff', '/statements'],
    ['subscription_expired', '/pro'],
    ['insight', '/dashboard'],
    ['weekly_summary', '/dashboard'],
  ])('%s -> %s', (type, expected) => {
    expect(routeForNotification({ type })).toBe(expected);
  });

  it('con la cartera en el payload, va a su pantalla', () => {
    expect(routeForNotification({ type: 'statement_due', wallet: 'w1' })).toBe('/statement/w1');
    expect(routeForNotification({ type: 'low_balance', wallet: 'w1' })).toBe('/wallet/w1');
  });

  it('sin type reconocido, cae a /dashboard', () => {
    expect(routeForNotification({})).toBe('/dashboard');
    expect(routeForNotification({ type: 'algo-nuevo' })).toBe('/dashboard');
  });
});
