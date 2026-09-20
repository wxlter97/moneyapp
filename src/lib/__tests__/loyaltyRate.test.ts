import { pickRate, weekdayMon0 } from '../loyaltyRate';

describe('weekdayMon0', () => {
  it('cuenta desde el lunes, como el backend', () => {
    expect(weekdayMon0('2026-09-21')).toBe(0); // lunes
    expect(weekdayMon0('2026-09-23')).toBe(2); // miércoles
    expect(weekdayMon0('2026-09-27')).toBe(6); // domingo
  });
});

describe('pickRate', () => {
  const program = {
    default_rate: '1.0000',
    category_rates: [
      { category_type: 'super', rate: '1.5000', weekday: null },
      { category_type: 'super', rate: '2.0000', weekday: 0 },
    ],
  };

  it('usa la tasa del día si coincide', () => {
    expect(pickRate(program, 'super', '2026-09-21')).toBe('2.0000');
  });
  it('otro día cae a la tasa del rubro sin día', () => {
    expect(pickRate(program, 'super', '2026-09-22')).toBe('1.5000');
  });
  it('un rubro sin tasa cae a la base', () => {
    expect(pickRate(program, 'gas', '2026-09-21')).toBe('1.0000');
  });
  it('sin rubro usa la base', () => {
    expect(pickRate(program, null, '2026-09-21')).toBe('1.0000');
  });
  it('un bono de otro día no aplica y cae a la base si no hay tasa sin día', () => {
    const p = { default_rate: '1', category_rates: [{ category_type: 'super', rate: '2', weekday: 0 }] };
    expect(pickRate(p, 'super', '2026-09-22')).toBe('1');
  });
});
