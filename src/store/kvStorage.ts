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

const webStorage: KVStorage = {
  async getItem(name) {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  async setItem(name, value) {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* modo privado / storage lleno: se ignora */
    }
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
