import axios from 'axios';

import type { DRFErrorBody } from './types';

/** Extrae un mensaje legible de un error de axios / DRF. */
export function errorMessage(err: unknown, fallback = 'Algo salió mal.'): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback;
  }

  if (err.code === 'ECONNABORTED') return 'La petición tardó demasiado.';
  if (!err.response) return 'No se pudo conectar con el servidor.';

  const body = err.response.data as DRFErrorBody | undefined;
  if (!body) return `Error ${err.response.status}.`;

  if (typeof body === 'string') return body;
  if ('detail' in body && typeof body.detail === 'string') return body.detail;

  // { campo: ["msg", ...] | "msg" }
  const parts: string[] = [];
  for (const value of Object.values(body)) {
    if (Array.isArray(value)) parts.push(...value.map(String));
    else if (typeof value === 'string') parts.push(value);
  }
  return parts.length ? parts.join(' ') : `Error ${err.response.status}.`;
}

/** Errores de validación por campo (400 de DRF), para pintarlos en formularios. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!axios.isAxiosError(err) || !err.response) return {};
  const body = err.response.data as DRFErrorBody | undefined;
  if (!body || typeof body === 'string' || 'detail' in body) return {};

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    out[key] = Array.isArray(value) ? value.map(String).join(' ') : String(value);
  }
  return out;
}
