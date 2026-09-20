import type { LoyaltyCategoryRate, LoyaltyMerchant } from '@/api/types';

import { autopayRate, matchMerchant, normalizeText, pickRate, qualifies, weekdayMon0 } from '../loyaltyRate';

const rate = (
  over: Partial<LoyaltyCategoryRate> & { rate: string },
): LoyaltyCategoryRate => ({
  id: 'r', program: 'p', category_type: null, merchant: null, weekday: null,
  requires_autopay: false, ...over,
});

describe('weekdayMon0', () => {
  it('cuenta desde el lunes, como el backend', () => {
    expect(weekdayMon0('2026-09-21')).toBe(0); // lunes
    expect(weekdayMon0('2026-09-23')).toBe(2); // miércoles
    expect(weekdayMon0('2026-09-27')).toBe(6); // domingo
  });
});

describe('normalizeText', () => {
  it('quita tildes, mayúsculas y puntuación', () => {
    expect(normalizeText("  McDonald's — Metrocentro ")).toBe('mcdonald s metrocentro');
    expect(normalizeText('Súper Selectos')).toBe('super selectos');
    expect(normalizeText(null)).toBe('');
  });
});

describe('matchMerchant', () => {
  const m = (id: string, name: string, aliases: string[]): LoyaltyMerchant => ({
    id, name, category_type: null, aliases: [name, ...aliases],
  });
  const merchants = [
    m('selectos', 'Súper Selectos', ['selectos']),
    m('mc', "McDonald's", ['mc', 'mcdonalds']),
    m('uber', 'Uber', []),
    m('eats', 'Uber Eats', []),
  ];

  it('reconoce sin importar mayúsculas ni tildes', () => {
    expect(matchMerchant('SUPER selectos san miguel', merchants)?.id).toBe('selectos');
  });
  it('sólo cuenta como palabra completa', () => {
    expect(matchMerchant('mc combo', merchants)?.id).toBe('mc');
    expect(matchMerchant('mcafee antivirus', merchants)).toBeUndefined();
  });
  it('gana el alias más largo', () => {
    expect(matchMerchant('uber eats pedido', merchants)?.id).toBe('eats');
    expect(matchMerchant('uber a casa', merchants)?.id).toBe('uber');
  });
  it('una descripción vacía o desconocida no reconoce nada', () => {
    expect(matchMerchant('', merchants)).toBeUndefined();
    expect(matchMerchant('pupusas', merchants)).toBeUndefined();
  });
});

describe('pickRate', () => {
  const program = {
    default_rate: '0.01',
    category_rates: [
      rate({ category_type: 'super', rate: '0.02' }),
      rate({ category_type: 'super', rate: '0.03', weekday: 0 }),
      rate({ merchant: 'selectos', rate: '0.07' }),
      rate({ merchant: 'selectos', rate: '0.09', weekday: 0 }),
    ],
  };
  const MON = '2026-09-21';
  const TUE = '2026-09-22';

  it('gana comercio+día, luego comercio, rubro+día, rubro y base', () => {
    expect(pickRate(program, 'super', MON, 'selectos')).toBe('0.09');
    expect(pickRate(program, 'super', TUE, 'selectos')).toBe('0.07');
    expect(pickRate(program, 'super', MON)).toBe('0.03');
    expect(pickRate(program, 'super', TUE)).toBe('0.02');
    expect(pickRate(program, 'gas', TUE)).toBe('0.01');
    expect(pickRate(program, null, TUE)).toBe('0.01');
  });
  it('un comercio sin reglas cae al rubro', () => {
    expect(pickRate(program, 'super', TUE, 'otro')).toBe('0.02');
  });
  it('un bono de otro día no aplica', () => {
    const p = { default_rate: '1', category_rates: [rate({ category_type: 'super', rate: '2', weekday: 0 })] };
    expect(pickRate(p, 'super', TUE)).toBe('1');
  });
});

describe('qualifies (compra mínima)', () => {
  it('es inclusiva y opcional', () => {
    expect(qualifies({ min_amount: '10.00' }, 10)).toBe(true);
    expect(qualifies({ min_amount: '10.00' }, 10.01)).toBe(true);
    expect(qualifies({ min_amount: '10.00' }, 9.99)).toBe(false);
    expect(qualifies({ min_amount: null }, 0.01)).toBe(true);
  });
});

describe('cargos automáticos', () => {
  const program = {
    default_rate: '0.01',
    category_rates: [rate({ category_type: 'agua', rate: '0.05', requires_autopay: true })],
  };

  it('la tasa de cargo automático sólo cuenta si el gasto lo es', () => {
    expect(pickRate(program, 'agua', '2026-09-22')).toBe('0.01');
    expect(pickRate(program, 'agua', '2026-09-22', null, true)).toBe('0.05');
    expect(pickRate(program, 'otro', '2026-09-22', null, true)).toBe('0.01');
  });
  it('con cargo automático gana a la tasa normal del mismo rubro', () => {
    const p = {
      default_rate: '0.01',
      category_rates: [
        rate({ category_type: 'agua', rate: '0.02' }),
        rate({ category_type: 'agua', rate: '0.05', requires_autopay: true }),
      ],
    };
    expect(pickRate(p, 'agua', '2026-09-22')).toBe('0.02');
    expect(pickRate(p, 'agua', '2026-09-22', null, true)).toBe('0.05');
  });
  it('autopayRate dice si hay algo que preguntar para ese rubro o comercio', () => {
    expect(autopayRate(program, 'agua')).toBe('0.05');
    expect(autopayRate(program, 'gasolina')).toBeUndefined();
    expect(autopayRate(program, null, 'nadie')).toBeUndefined();
  });
});
