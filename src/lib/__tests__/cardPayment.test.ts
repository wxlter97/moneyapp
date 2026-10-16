import type { PaymentGuidance, Wallet } from '@/api/types';
import {
  compactPayment,
  cutoffFor,
  cutoffOnOrBefore,
  cycleRange,
  hasExtraPayoff,
  monthlyInterest,
  paymentHeadline,
  segmentsText,
  spendableBalance,
} from '../cardPayment';
import { formatMoney } from '../money';

const g = (over: Partial<PaymentGuidance> = {}): PaymentGuidance => ({
  phase: 'due',
  status: 'pending',
  amount: '200.00',
  statement_balance: '250.00',
  minimum_remaining: '25.00',
  cutoff_date: '2026-10-03',
  due_date: '2026-10-20',
  days_left: 4,
  next_cutoff_date: '2026-11-03',
  next_statement_so_far: '80.00',
  payoff_today: '280.00',
  ...over,
});

const text = (guidance: PaymentGuidance) => {
  const h = paymentHeadline(guidance);
  return {
    title: segmentsText(h.title, 'USD'),
    sub: h.sub ? segmentsText(h.sub, 'USD') : null,
    tone: h.tone,
  };
};

describe('paymentHeadline', () => {
  it('antes de la fecha límite: paga X antes del día', () => {
    const t = text(g());
    expect(t.title).toBe(`Paga ${formatMoney(200, 'USD')} antes del 20 oct`);
    expect(t.sub).toBe('Faltan 4 días · así no pagas intereses');
  });

  it('vence hoy / mañana', () => {
    expect(text(g({ days_left: 0 })).sub).toMatch(/^Vence hoy/);
    expect(text(g({ days_left: 1 })).sub).toMatch(/^Vence mañana/);
  });

  it('vencido', () => {
    const t = text(g({ phase: 'overdue', days_left: -2 }));
    expect(t.title).toBe(`Vencido: paga ${formatMoney(200, 'USD')} hoy`);
    expect(t.tone).toBe('expense');
  });

  it('pagado: listo hasta el próximo corte y lo que ya lleva', () => {
    const t = text(g({ phase: 'paid', amount: '0.00' }));
    expect(t.title).toBe('Listo ✓ hasta el corte del 3 nov');
    expect(t.sub).toBe(`Llevas ${formatMoney(80, 'USD')} para el próximo estado (corte 3 nov)`);
  });

  it('nada que pagar sin compras nuevas muestra el próximo corte', () => {
    const t = text(g({ phase: 'nothing_due', amount: '0.00', next_statement_so_far: '0.00' }));
    expect(t.title).toBe('Nada que pagar');
    expect(t.sub).toBe('Próximo corte: 3 nov');
  });
});

describe('compactPayment / hasExtraPayoff', () => {
  it('etiqueta corta por fase', () => {
    expect(compactPayment(g())).toEqual({ label: 'Pagar antes del 20 oct', amount: 200, tone: 'warning' });
    expect(compactPayment(g({ phase: 'paid' })).amount).toBeNull();
  });

  it('pagar todo es opción aparte sólo si supera lo del estado', () => {
    expect(hasExtraPayoff(g())).toBe(true);
    expect(hasExtraPayoff(g({ payoff_today: '200.00' }))).toBe(false);
  });
});

describe('monthlyInterest / spendableBalance', () => {
  it('tasa anual / 12', () => {
    expect(monthlyInterest(1000, 24)).toBe(20);
    expect(monthlyInterest(1000, null)).toBeNull();
    expect(monthlyInterest(0, 24)).toBe(0);
  });

  it('suma sólo carteras de gasto activas, en la moneda, con saldo positivo', () => {
    const w = (over: Partial<Wallet>) =>
      ({ purpose: 'spending', kind: 'bank', currency: 'USD', is_active: true, is_archived: false, current_balance: '0', ...over }) as Wallet;
    expect(
      spendableBalance(
        [
          w({ current_balance: '100.00' }),
          w({ current_balance: '-20.00' }),
          w({ current_balance: '50.00', kind: 'credit' }),
          w({ current_balance: '50.00', currency: 'EUR' }),
          w({ current_balance: '50.00', purpose: 'savings' }),
          w({ current_balance: '30.00', kind: 'cash' }),
        ],
        'USD',
      ),
    ).toBe(130);
  });
});

describe('ciclos de corte', () => {
  it('último corte en o antes de una fecha', () => {
    expect(cutoffOnOrBefore(3, '2026-10-16')).toBe('2026-10-03');
    expect(cutoffOnOrBefore(20, '2026-10-16')).toBe('2026-09-20');
    expect(cutoffOnOrBefore(31, '2026-03-15')).toBe('2026-02-28');
  });

  it('ciclo en curso y el último cerrado', () => {
    expect(cycleRange(3, 0, '2026-10-16')).toEqual({ from: '2026-10-04', to: '2026-11-03', open: true });
    expect(cycleRange(3, -1, '2026-10-16')).toEqual({ from: '2026-09-04', to: '2026-10-03', open: false });
  });

  it('corte en el que cae un movimiento', () => {
    expect(cutoffFor(3, '2026-10-03')).toBe('2026-10-03');
    expect(cutoffFor(3, '2026-10-04')).toBe('2026-11-03');
    expect(cutoffFor(3, '2026-09-30')).toBe('2026-10-03');
  });
});
