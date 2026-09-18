import { routeForNotification } from '@/lib/notificationRouting';

describe('routeForNotification', () => {
  it.each([
    ['budget_threshold', '/budgets'],
    ['invitation', '/invitations'],
    ['email_import_pending', '/imports'],
    ['recurring_due', '/dashboard'],
    ['installment_due', '/dashboard'],
    ['low_balance', '/dashboard'],
    ['statement_due', '/dashboard'],
    ['insight', '/dashboard'],
  ])('%s -> %s', (type, expected) => {
    expect(routeForNotification({ type })).toBe(expected);
  });

  it('sin type reconocido, cae a /dashboard', () => {
    expect(routeForNotification({})).toBe('/dashboard');
    expect(routeForNotification({ type: 'algo-nuevo' })).toBe('/dashboard');
  });
});
