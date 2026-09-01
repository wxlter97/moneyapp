import {
  addMonths,
  formatShortDate,
  formatYearMonth,
  isSameOrAfter,
  monthRange,
} from '../date';

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
    expect(formatYearMonth({ year: 2026, month: 8 })).toBe('agosto 2026');
    expect(formatShortDate('2026-08-31')).toBe('31 ago');
  });
});
