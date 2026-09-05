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

/** Descarga `content` como archivo (solo web). Devuelve false si no es posible.
 * `bom`: antepone el BOM de UTF-8 -- lo quiere Excel para abrir un CSV con
 * acentos, pero le sobra a un .json (algunos parsers estrictos lo rechazan). */
export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
  bom = true,
): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const blob = new Blob([bom ? '﻿' + content : content], { type: mime });
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

/** Descarga un objeto como archivo `.json` legible (indentado), sin BOM. */
export function downloadJsonFile(filename: string, data: unknown): boolean {
  return downloadTextFile(
    filename,
    JSON.stringify(data, null, 2),
    'application/json;charset=utf-8',
    false,
  );
}

/**
 * Abre el selector de archivos del sistema (solo web) y devuelve el JSON
 * parseado del archivo elegido, o `null` si se canceló, no es JSON válido,
 * o no es posible (nativo). No lanza: los errores de parseo también dan `null`.
 */
export function pickJsonFile(): Promise<unknown | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result)));
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
