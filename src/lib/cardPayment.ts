import type { ISODate, PaymentGuidance, Wallet } from '@/api/types';
import { formatShortDate, todayISO } from '@/lib/date';
import { formatMoney, toNumber } from '@/lib/money';

/**
 * «¿Cuánto pago hoy?» de una tarjeta de crédito, igual en todos lados
 * (detalle del estado, listado, fila de la cartera, Resumen). La fase la
 * calcula el backend (`services.payment_guidance`); acá sólo se arma la
 * frase. Un segmento es texto o un monto (para que la UI lo pinte con
 * `<Money>` y respete el modo oculto).
 */
export type Segment = string | { money: number };

export type PaymentTone = 'expense' | 'warning' | 'income' | 'muted';

export interface PaymentHeadline {
  tone: PaymentTone;
  /** La frase grande: «Paga $200 antes del 10 sep». */
  title: Segment[];
  /** Una línea de apoyo: días que faltan, lo que va al próximo estado... */
  sub: Segment[] | null;
}

const EPS = 0.005;

function daysText(days: number): string {
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Faltan ${days} días`;
}

export function paymentHeadline(g: PaymentGuidance): PaymentHeadline {
  const amount = toNumber(g.amount);
  const next = toNumber(g.next_statement_so_far);
  const nextLine: Segment[] | null =
    next > EPS
      ? ['Llevas ', { money: next }, ` para el próximo estado (corte ${formatShortDate(g.next_cutoff_date)})`]
      : null;

  switch (g.phase) {
    case 'due':
      return {
        tone: 'warning',
        title: ['Paga ', { money: amount }, g.due_date ? ` antes del ${formatShortDate(g.due_date)}` : ''],
        sub: g.days_left != null ? [`${daysText(g.days_left)} · así no pagas intereses`] : ['Así no pagas intereses'],
      };
    case 'overdue':
      return {
        tone: 'expense',
        title: ['Vencido: paga ', { money: amount }, ' hoy'],
        sub: g.due_date ? [`Venció el ${formatShortDate(g.due_date)}`] : null,
      };
    case 'financed':
      return {
        tone: 'warning',
        title: ['Quedan ', { money: amount }, ' generando intereses'],
        sub: ['Cubriste el mínimo a tiempo; paga el resto cuanto antes'],
      };
    case 'paid':
      return {
        tone: 'income',
        title: [`Listo ✓ hasta el corte del ${formatShortDate(g.next_cutoff_date)}`],
        sub: nextLine,
      };
    case 'nothing_due':
    default:
      return {
        tone: 'muted',
        title: ['Nada que pagar'],
        sub: nextLine ?? [`Próximo corte: ${formatShortDate(g.next_cutoff_date)}`],
      };
  }
}

/** La frase en texto plano (lectores de pantalla, tests). */
export function segmentsText(segments: Segment[], currency: string): string {
  return segments.map((s) => (typeof s === 'string' ? s : formatMoney(s.money, currency))).join('');
}

/** Versión corta para filas (listado de tarjetas, Carteras): una etiqueta
 * y, si hay que pagar, el monto. */
export function compactPayment(g: PaymentGuidance): {
  label: string;
  amount: number | null;
  tone: PaymentTone;
} {
  const amount = toNumber(g.amount);
  switch (g.phase) {
    case 'due':
      return {
        label: g.due_date ? `Pagar antes del ${formatShortDate(g.due_date)}` : 'Pagar',
        amount,
        tone: 'warning',
      };
    case 'overdue':
      return { label: 'Vencido · pagar hoy', amount, tone: 'expense' };
    case 'financed':
      return { label: 'Genera intereses', amount, tone: 'warning' };
    case 'paid':
      return { label: 'Al día', amount: null, tone: 'income' };
    default:
      return { label: 'Nada que pagar', amount: null, tone: 'muted' };
  }
}

/** «Pagar todo» sólo tiene sentido como opción aparte si es más que lo del
 * estado (hay compras después del corte). */
export function hasExtraPayoff(g: PaymentGuidance): boolean {
  return toNumber(g.payoff_today) > toNumber(g.amount) + EPS;
}

/** Interés estimado de un mes sobre `principal`, con la tasa anual (%) de la
 * tarjeta -- mismo cálculo que el backend (`_monthly_interest`). */
export function monthlyInterest(principal: number, annualRatePct: number | null): number | null {
  if (!annualRatePct) return null;
  if (principal <= EPS) return 0;
  return Math.round(((principal * annualRatePct) / 100 / 12) * 100) / 100;
}

/** Dinero disponible para pagar la tarjeta: saldo positivo de las carteras
 * de gasto (banco/efectivo) en la misma moneda. */
export function spendableBalance(wallets: Wallet[], currency: string): number {
  return wallets
    .filter(
      (w) =>
        w.purpose === 'spending' &&
        w.kind !== 'credit' &&
        w.currency === currency &&
        w.is_active &&
        !w.is_archived,
    )
    .reduce((sum, w) => sum + Math.max(0, toNumber(w.current_balance)), 0);
}

// --- Ciclos de corte (del lado del cliente, sin depender de Plus) ---------

function parse(iso: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y: y!, m: m!, d: d! };
}

function iso(y: number, m: number, d: number): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Día `day` del mes, recortado al último día real (corte el 31 en febrero). */
function clamped(y: number, m: number, day: number): ISODate {
  const last = new Date(y, m, 0).getDate();
  return iso(y, m, Math.min(day, last));
}

function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const z = m - 1 + delta;
  return { y: y + Math.floor(z / 12), m: (((z % 12) + 12) % 12) + 1 };
}

function addDays(date: ISODate, days: number): ISODate {
  const { y, m, d } = parse(date);
  const dt = new Date(y, m - 1, d + days);
  return iso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/** Último corte en o antes de `on` (igual que `_cutoff_on_or_before`). */
export function cutoffOnOrBefore(billingDay: number, on: ISODate): ISODate {
  const { y, m } = parse(on);
  const here = clamped(y, m, billingDay);
  if (here <= on) return here;
  const prev = shiftMonth(y, m, -1);
  return clamped(prev.y, prev.m, billingDay);
}

function cutoffShift(billingDay: number, cutoff: ISODate, delta: number): ISODate {
  const { y, m } = parse(cutoff);
  const t = shiftMonth(y, m, delta);
  return clamped(t.y, t.m, billingDay);
}

export interface CycleRange {
  from: ISODate;
  /** Fecha de corte con la que cierra el ciclo. */
  to: ISODate;
  /** true = el ciclo en curso (todavía no corta). */
  open: boolean;
}

/** El ciclo de facturación `offset` respecto de hoy: 0 = el que está en
 * curso (va al próximo estado), -1 = el último que ya cortó, etc. */
export function cycleRange(billingDay: number, offset: number, today: ISODate = todayISO()): CycleRange {
  const last = cutoffOnOrBefore(billingDay, today);
  const to = cutoffShift(billingDay, last, offset + 1);
  const prev = cutoffShift(billingDay, last, offset);
  return { from: addDays(prev, 1), to, open: offset >= 0 };
}

/** «4 sep – 3 oct» */
export function formatCycleRange({ from, to }: CycleRange): string {
  return `${formatShortDate(from)} – ${formatShortDate(to)}`;
}

/** Fecha de corte en la que «cae» un movimiento del día `date`. */
export function cutoffFor(billingDay: number, date: ISODate): ISODate {
  const prev = cutoffOnOrBefore(billingDay, date);
  return prev === date ? prev : cutoffShift(billingDay, prev, 1);
}
