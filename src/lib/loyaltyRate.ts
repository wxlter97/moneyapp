import type { ISODate, LoyaltyCategoryRate, LoyaltyMerchant, UUID } from '@/api/types';

/** Día de la semana de una fecha ISO ("2026-09-21") con lunes = 0 … domingo = 6:
 * los mismos números que `date.weekday()` en el backend (`LoyaltyCategoryRate.weekday`).
 * Se arma con componentes locales: `new Date("2026-09-21")` se interpreta en UTC
 * y en zonas al oeste de Greenwich caería en el día anterior. */
export function weekdayMon0(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** Minúsculas, sin tildes y con todo lo que no sea letra o número como un
 * espacio: "McDonald's — Metrocentro" -> "mcdonald s metrocentro". Misma regla
 * que `normalize_text` del backend (`apps/loyalty/services.py`): si se cambia
 * una, se cambia la otra. */
export function normalizeText(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** El comercio que aparece en la descripción, o `undefined`. Mismo criterio que
 * `match_merchant` del backend: sólo cuenta como palabra(s) completa(s) (así
 * "mc" no dispara con "mcdonalds") y gana el alias más largo ("uber eats" antes
 * que "uber"). Es una vista previa: lo que vale es lo que decide el servidor. */
export function matchMerchant(
  description: string | null | undefined,
  merchants: LoyaltyMerchant[],
): LoyaltyMerchant | undefined {
  const text = ` ${normalizeText(description)} `;
  if (!text.trim()) return undefined;
  let best: LoyaltyMerchant | undefined;
  let bestLen = 0;
  for (const merchant of merchants) {
    for (const alias of merchant.aliases) {
      const needle = normalizeText(alias);
      if (needle.length > bestLen && text.includes(` ${needle} `)) {
        best = merchant;
        bestLen = needle.length;
      }
    }
  }
  return best;
}

/** Si una compra de ese monto llega a la compra mínima del programa (`min_amount`). */
export function qualifies(program: { min_amount: string | null }, amount: number): boolean {
  return program.min_amount == null || amount >= Number(program.min_amount);
}

/** Si el programa tiene una tasa que sólo vale para cargos automáticos en ese rubro
 * o comercio: es lo que decide si el formulario pregunta "¿es un cargo automático?". */
export function autopayRate(
  program: { category_rates: LoyaltyCategoryRate[] },
  categoryType: UUID | null | undefined,
  merchantId?: UUID | null,
): string | undefined {
  return program.category_rates.find(
    (r) =>
      r.requires_autopay &&
      ((categoryType && r.category_type === categoryType) || (merchantId && r.merchant === merchantId)),
  )?.rate;
}

/**
 * Tasa efectiva de un programa para una compra: la misma regla que
 * `LoyaltyProgram.rate_for` del backend, gana la más específica:
 * comercio+día, comercio, rubro+día, rubro, y si no hay ninguna la tasa base.
 * Las tasas `requires_autopay` sólo cuentan si `autopay` y, en ese caso, ganan a
 * las de cualquier cargo. Es sólo la vista previa antes de guardar; lo que vale
 * es lo que calcula el servidor.
 */
export function pickRate(
  program: { default_rate: string; category_rates: LoyaltyCategoryRate[] },
  categoryType: UUID | null | undefined,
  date: ISODate,
  merchantId?: UUID | null,
  autopay = false,
): string {
  const day = weekdayMon0(date);
  const find = (match: (r: LoyaltyCategoryRate) => boolean) => {
    for (const autopayRule of autopay ? [true, false] : [false]) {
      const rows = program.category_rates.filter((r) => match(r) && r.requires_autopay === autopayRule);
      const rate = (rows.find((r) => r.weekday === day) ?? rows.find((r) => r.weekday == null))?.rate;
      if (rate !== undefined) return rate;
    }
    return undefined;
  };
  const merchantRate = merchantId ? find((r) => r.merchant === merchantId) : undefined;
  if (merchantRate !== undefined) return merchantRate;
  const categoryRate = categoryType ? find((r) => r.category_type === categoryType) : undefined;
  return categoryRate ?? program.default_rate;
}
