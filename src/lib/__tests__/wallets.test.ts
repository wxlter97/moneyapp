import type { Wallet, WalletPurpose } from '@/api/types';
import { flattenTree, groupByPurpose } from '../wallets';

const w = (id: string, purpose: WalletPurpose, parent: string | null = null): Wallet =>
  ({
    id,
    name: id,
    purpose,
    parent,
    currency: 'USD',
    opening_balance: '0',
    current_balance: '0',
    aggregated_balance: '0',
    counts_toward_net_worth: true,
    goal_amount: null,
    goal_date: null,
    monthly_contribution: null,
    progress_pct: null,
    card_last4: null,
    billing_cycle_day: null,
    payment_due_day: null,
    interest_rate: null,
    due_date: null,
    counterparty: '',
    visibility: 'shared',
    owner: null,
    is_active: true,
    is_default: false,
    created_at: '',
    updated_at: '',
  }) as Wallet;

describe('flattenTree', () => {
  it('pone cada raíz seguida de sus descendientes con depth', () => {
    const nodes = flattenTree([
      w('root', 'spending'),
      w('child', 'spending', 'root'),
      w('grandchild', 'spending', 'child'),
      w('other', 'spending'),
    ]);
    expect(nodes.map((n) => [n.wallet.id, n.depth])).toEqual([
      ['root', 0],
      ['child', 1],
      ['grandchild', 2],
      ['other', 0],
    ]);
    expect(nodes[0].hasChildren).toBe(true);
    expect(nodes[2].hasChildren).toBe(false);
  });
});

describe('groupByPurpose', () => {
  it('agrupa en orden canónico y omite los tipos sin carteras', () => {
    const groups = groupByPurpose([
      w('a', 'debt'),
      w('b', 'spending'),
      w('c', 'asset'),
    ]);
    expect(groups.map((g) => g.purpose)).toEqual(['spending', 'debt', 'asset']);
  });
});
