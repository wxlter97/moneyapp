import {
  addMonths,
  formatLongDateTime,
  formatShortDate,
  formatYearMonth,
  isFutureDay,
  isSameOrAfter,
  monthRange,
} from '../date';

describe('formatLongDateTime', () => {
  it('incluye el año, a diferencia de formatDateTime', () => {
    expect(formatLongDateTime('2026-09-22T12:00:00Z')).toBe('22 de septiembre de 2026');
  });

  it('un año distinto se nota (para vencimientos lejos en el futuro)', () => {
    expect(formatLongDateTime('2027-01-05T12:00:00Z')).toBe('5 de enero de 2027');
  });

  it('un ISO inválido se devuelve tal cual, sin tirar', () => {
    expect(formatLongDateTime('no-es-una-fecha')).toBe('no-es-una-fecha');
  });
});

describe('addMonths', () => {
  it('avanza y retrocede cruzando años', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 6 }, -18)).toEqual({ year: 2024, month: 12 });
  });
});

describe('isSameOrAfter', () => {
  it('compara year-month', () => {
    expect(isSameOrAfter({ year: 2026, month: 8 }, { year: 2026, month: 8 })).toBe(true);
    expect(isSameOrAfter({ year: 2026, month: 7 }, { year: 2026, month: 8 })).toBe(false);
    expect(isSameOrAfter({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBe(true);
  });
});

describe('monthRange', () => {
  it('da el primer y último día del mes', () => {
    expect(monthRange({ year: 2026, month: 2 })).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(monthRange({ year: 2024, month: 2 })).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
  });
});

describe('formatYearMonth / formatShortDate', () => {
  it('usa nombres de mes en español', () => {
    expect(formatYearMonth({ year: 2026, month: 8 })).toBe('Agosto 2026');
    expect(formatShortDate('2026-08-31')).toBe('31 ago');
  });
});

// Auditoría de producto §11: una transacción real con fecha futura (creada
// a mano) se mostraba en la lista sin distinguirse del historial -- "1 dic"
// arriba de "ayer", mismo encabezado de día que cualquier otro.
describe('isFutureDay', () => {
  const now = new Date(2026, 8, 14); // 14 sep 2026

  it('hoy no es futuro', () => {
    expect(isFutureDay('2026-09-14', now)).toBe(false);
  });

  it('ayer no es futuro', () => {
    expect(isFutureDay('2026-09-13', now)).toBe(false);
  });

  it('mañana sí es futuro', () => {
    expect(isFutureDay('2026-09-15', now)).toBe(true);
  });

  it('una fecha de un mes más adelante es futuro', () => {
    expect(isFutureDay('2026-12-01', now)).toBe(true);
  });
});
