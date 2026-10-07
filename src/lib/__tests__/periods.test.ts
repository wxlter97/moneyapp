import {
  nextPeriodStart,
  periodEnd,
  periodLabel,
  periodStart,
  previousPeriodStart,
} from '../periods';

describe('periodStart', () => {
  it('diario: la misma fecha', () => {
    expect(periodStart('2026-08-13', 'daily')).toBe('2026-08-13');
  });

  it('semanal: lunes de esa semana', () => {
    expect(periodStart('2026-08-13', 'weekly')).toBe('2026-08-10'); // jueves -> lunes
    expect(periodStart('2026-08-10', 'weekly')).toBe('2026-08-10'); // ya es lunes
  });

  it('quincenal: 1° o 16 del mes', () => {
    expect(periodStart('2026-08-05', 'biweekly')).toBe('2026-08-01');
    expect(periodStart('2026-08-15', 'biweekly')).toBe('2026-08-01');
    expect(periodStart('2026-08-16', 'biweekly')).toBe('2026-08-16');
    expect(periodStart('2026-08-31', 'biweekly')).toBe('2026-08-16');
  });

  it('mensual: 1° del mes', () => {
    expect(periodStart('2026-08-27', 'monthly')).toBe('2026-08-01');
  });

  it('anual: 1° de enero', () => {
    expect(periodStart('2026-08-27', 'yearly')).toBe('2026-01-01');
  });
});

describe('periodEnd', () => {
  it('respeta meses de distinto largo y años bisiestos', () => {
    expect(periodEnd('2026-02-01', 'monthly')).toBe('2026-02-28');
    expect(periodEnd('2024-02-01', 'monthly')).toBe('2024-02-29');
    expect(periodEnd('2026-08-16', 'biweekly')).toBe('2026-08-31');
    expect(periodEnd('2026-08-01', 'biweekly')).toBe('2026-08-15');
    expect(periodEnd('2026-08-10', 'weekly')).toBe('2026-08-16');
    expect(periodEnd('2026-01-01', 'yearly')).toBe('2026-12-31');
  });
});

describe('nextPeriodStart / previousPeriodStart', () => {
  it('cruzan límites de mes y año', () => {
    expect(nextPeriodStart('2026-01-01', 'monthly')).toBe('2026-02-01');
    expect(nextPeriodStart('2026-12-01', 'monthly')).toBe('2027-01-01');
    expect(previousPeriodStart('2027-01-01', 'monthly')).toBe('2026-12-01');
    expect(nextPeriodStart('2026-08-16', 'biweekly')).toBe('2026-09-01');
    expect(previousPeriodStart('2026-08-10', 'weekly')).toBe('2026-08-03');
  });
});

describe('periodLabel', () => {
  it('formatea cada cadencia en español', () => {
    expect(periodLabel('2026-08-13', 'daily')).toBe('13 ago 2026');
    expect(periodLabel('2026-08-10', 'weekly')).toBe('Semana del 10 ago-16');
    expect(periodLabel('2026-08-31', 'weekly')).toBe('Semana del 31 ago'); // cruza a septiembre
    expect(periodLabel('2026-08-16', 'biweekly')).toBe('16-31 ago 2026');
    expect(periodLabel('2026-08-01', 'monthly')).toBe('Agosto 2026');
    expect(periodLabel('2026-01-01', 'yearly')).toBe('2026');
  });
});

describe('día de inicio de semana (weekStart)', () => {
  // 2026-10-07 es miércoles.
  it('lunes por defecto, domingo o miércoles si se pide', () => {
    expect(periodStart('2026-10-07', 'weekly')).toBe('2026-10-05');
    expect(periodStart('2026-10-07', 'weekly', 6)).toBe('2026-10-04');
    expect(periodStart('2026-10-07', 'weekly', 2)).toBe('2026-10-07');
  });

  it('el sábado sigue en la semana que arrancó el domingo anterior', () => {
    expect(periodStart('2026-10-10', 'weekly', 6)).toBe('2026-10-04');
    expect(periodStart('2026-10-04', 'weekly', 6)).toBe('2026-10-04');
  });

  it('previousPeriodStart respeta el día de inicio', () => {
    expect(previousPeriodStart('2026-10-04', 'weekly', 6)).toBe('2026-09-27');
  });

  it('no afecta a otras cadencias', () => {
    expect(periodStart('2026-10-07', 'monthly', 3)).toBe('2026-10-01');
  });
});
