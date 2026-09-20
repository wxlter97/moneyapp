/**
 * KV asíncrono para `zustand/persist`.
 * Nativo: AsyncStorage. Web: localStorage (envuelto en promesas).
 * Para datos NO sensibles (id de workspace activo, flags de UI).
 * Los tokens JWT van por `api/tokenStorage`, no aquí.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface KVStorage {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

/** Clave de la caché de React Query en el storage (ver `queryPersister.ts`). */
export const QUERY_CACHE_KEY = 'budget-query-cache';

/**
 * `localStorage` tiene tope (~5 M de caracteres por origen) y lo comparten la
 * caché de consultas, los stores de zustand y los tokens de sesión. La caché es
 * lo único prescindible -- se vuelve a bajar del servidor --, así que si una
 * escritura no cabe se libera ella y se reintenta. Devuelve si la escritura al
 * final quedó guardada.
 */
export function setLocalItemEvicting(name: string, value: string): boolean {
  try {
    localStorage.setItem(name, value);
    return true;
  } catch {
    /* cuota llena, modo privado… */
  }
  if (name === QUERY_CACHE_KEY) {
    // La caché es la que no cabe: se descarta también la copia anterior, que
    // seguiría ocupando el espacio que les hace falta a los demás.
    try {
      localStorage.removeItem(name);
    } catch {
      /* noop */
    }
    return false;
  }
  try {
    localStorage.removeItem(QUERY_CACHE_KEY);
    localStorage.setItem(name, value);
    return true;
  } catch {
    return false;
  }
}

export const webStorage: KVStorage = {
  async getItem(name) {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  async setItem(name, value) {
    setLocalItemEvicting(name, value);
  },
  async removeItem(name) {
    try {
      localStorage.removeItem(name);
    } catch {
      /* noop */
    }
  },
};

export const asyncKVStorage: KVStorage =
  Platform.OS === 'web' ? webStorage : AsyncStorage;
