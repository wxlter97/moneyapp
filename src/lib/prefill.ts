/**
 * Enlaces a "Agregar transacción" ya precargada (ver `transaction/new.tsx`):
 * registrar un recurrente, pagar una tarjeta, reponer una cartera...
 */
import type { Href } from 'expo-router';

import type { Wallet } from '@/api/types';

export function newTransactionHref(params: Record<string, string | null | undefined>): Href {
  const qs = Object.entries(params)
    .filter((e): e is [string, string] => !!e[1])
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return `/transaction/new?${qs}` as Href;
}

/** Desde qué cartera sale un pago hacia `targetId`: la cartera por defecto
 * (la misma que propone "Agregar transacción"), nunca la misma destino ni
 * otra tarjeta de crédito -- pagar una tarjeta con otra no es el caso común. */
export function pickSourceWallet(wallets: Wallet[], targetId: string): Wallet | undefined {
  const candidates = wallets.filter((w) => !w.is_archived && w.id !== targetId && w.kind !== 'credit');
  return candidates.find((w) => w.is_default) ?? candidates[0];
}

export function transferToHref(
  wallets: Wallet[],
  targetId: string,
  { amount, note, date }: { amount?: string; note?: string; date: string },
): Href {
  return newTransactionHref({
    prefillType: 'transfer',
    prefillWallet: pickSourceWallet(wallets, targetId)?.id,
    prefillToWallet: targetId,
    prefillAmount: amount,
    prefillDate: date,
    prefillNote: note,
  });
}
