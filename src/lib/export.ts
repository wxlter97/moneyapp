import { Platform } from 'react-native';

import type { Category, Transaction, Wallet } from '@/api/types';

const TYPE_LABEL: Record<Transaction['type'], string> = {
  income: 'ingreso',
  expense: 'gasto',
  transfer: 'transferencia',
};

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV de transacciones (una fila por movimiento), ordenado por fecha. */
export function transactionsToCsv(
  transactions: Transaction[],
  categories: Map<string, Category>,
  wallets: Map<string, Wallet>,
): string {
  const header = [
    'fecha',
    'tipo',
    'categoria',
    'cartera',
    'cartera_destino',
    'monto',
    'moneda',
    'nota',
    'cuenta_presupuesto',
  ];
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) =>
      [
        t.date,
        TYPE_LABEL[t.type],
        t.category ? (categories.get(t.category)?.name ?? '') : '',
        wallets.get(t.wallet)?.name ?? '',
        t.to_wallet ? (wallets.get(t.to_wallet)?.name ?? '') : '',
        t.amount,
        t.currency,
        t.description ?? '',
        t.counts_toward_budget ? 'si' : 'no',
      ]
        .map(csvCell)
        .join(','),
    );
  return [header.join(','), ...rows].join('\n');
}

/** Descarga `content` como archivo (solo web). Devuelve false si no es posible. */
export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const blob = new Blob(['﻿' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
